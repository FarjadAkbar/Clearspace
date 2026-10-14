import os,json,secrets,hashlib,hmac,uuid,logging,base64,subprocess,sys,asyncio
from contextlib import asynccontextmanager
from pathlib import Path
import httpx,spacy
from .protection import SQLiteProtection
from fastapi import FastAPI,Request,HTTPException,UploadFile,File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.concurrency import run_in_threadpool
from .analysis import JobInput,OrganizeInput,Thoughts,verify_assessment,experience_timeline
from .privacy import redact

MAX_BODY=6*1024*1024
logger=logging.getLogger('clearspace')
ROOT=Path(__file__).parent
ALLOWED_PROVIDER={'https://api.thehive.ai/api/v3/chat/completions','https://api-cdn.thehive.ai/api/v3/chat/completions','https://api-va1.thehive.ai/api/v3/chat/completions'}

@asynccontextmanager
async def lifespan(app):
    app.state.secret=os.environ['RATE_LIMIT_SECRET']
    if len(app.state.secret)<32:raise RuntimeError('RATE_LIMIT_SECRET must be at least 32 characters')
    app.state.key=os.environ['HIVE_API_KEY']
    if not app.state.key:raise RuntimeError('HIVE_API_KEY is required')
    app.state.provider=os.getenv('HIVE_ENDPOINT','https://api.thehive.ai/api/v3/chat/completions')
    if app.state.provider not in ALLOWED_PROVIDER:raise RuntimeError('Unsupported provider URL')
    app.state.token_hashes=json.loads(os.getenv('ACCESS_TOKEN_HASHES','[]'))
    app.state.public=os.getenv('PUBLIC_ACCESS','false').lower()=='true'
    if not app.state.public and not app.state.token_hashes:raise RuntimeError('Configure access tokens or explicitly enable public demo access')
    app.state.nlp=spacy.load('en_core_web_sm',disable=['parser','lemmatizer'])
    app.state.protection=SQLiteProtection(os.getenv('SQLITE_PATH','/data/clearspace.sqlite3'))
    app.state.http=httpx.AsyncClient(timeout=httpx.Timeout(45,connect=10),follow_redirects=False)
    app.state.prompts=json.loads((ROOT/'prompts.json').read_text(encoding='utf-8'))
    yield
    await app.state.http.aclose()

app=FastAPI(title='Clearspace API',version='1.1.0',lifespan=lifespan,docs_url=None,redoc_url=None,openapi_url=None)
origins=[o.strip() for o in os.getenv('CORS_ORIGINS','').split(',') if o.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=False,allow_methods=['POST','GET'],allow_headers=['Content-Type','Authorization'],expose_headers=['X-Request-ID','Retry-After'])
app.add_middleware(TrustedHostMiddleware,allowed_hosts=['clearspace.decentgatewaysllc.com','localhost','127.0.0.1','testserver'])

# Atomic quotas persisted across processes/restarts on the same local disk.
async def quota(request,key,limit,seconds):
    try:count,ttl=await request.app.state.protection.increment('clearspace:'+key,seconds)
    except Exception:raise HTTPException(503,'Request protection is temporarily unavailable')
    if count>limit:raise HTTPException(429,'Usage limit reached',headers={'Retry-After':str(max(1,ttl))})

def identity(request):
    auth=request.headers.get('authorization','')
    if auth:
        if not auth.startswith('Bearer ') or len(auth)>512:raise HTTPException(401,'Invalid access token')
        fingerprint=hashlib.sha256(auth[7:].encode()).hexdigest()
        if not any(hmac.compare_digest(fingerprint,d) for d in request.app.state.token_hashes):raise HTTPException(401,'Invalid access token')
        return 'token:'+fingerprint
    if not request.app.state.public:raise HTTPException(401,'Access token required')
    ip=request.client.host if request.client else 'unknown'
    return 'ip:'+hmac.new(request.app.state.secret.encode(),ip.encode(),hashlib.sha256).hexdigest()

class BodyLimit:
    def __init__(self,app):self.app=app
    async def __call__(self,scope,receive,send):
        if scope['type']!='http':return await self.app(scope,receive,send)
        length=next((v for k,v in scope['headers'] if k==b'content-length'),None)
        if length:
            try:too_big=int(length)>MAX_BODY
            except ValueError:too_big=True
            if too_big:return await JSONResponse({'message':'Request too large'},413)(scope,receive,send)
        size=0
        async def limited():
            nonlocal size
            message=await receive();size+=len(message.get('body',b''))
            if size>MAX_BODY:raise HTTPException(413,'Request too large')
            return message
        await self.app(scope,limited,send)
app.add_middleware(BodyLimit)

@app.middleware('http')
async def protect(request,call_next):
    request_id=uuid.uuid4().hex
    try:
        if request.url.path!='/health' and request.method!='OPTIONS':
            request.state.identity=identity(request)
            await quota(request,'requests:'+request.state.identity,60,60)
        response=await call_next(request)
    except HTTPException as error:response=JSONResponse({'message':error.detail},error.status_code,headers=error.headers)
    except Exception:
        # No exceptions/tracebacks containing document text, credentials or provider bodies.
        logger.error('request_failed reference=%s',request_id)
        response=JSONResponse({'message':'Service error'},500)
    response.headers.update({'X-Request-ID':request_id,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
    return response

@app.exception_handler(RequestValidationError)
async def validation_error(request,error):return JSONResponse({'message':'Invalid input. Check text length and required fields.'},422)
@app.exception_handler(HTTPException)
async def http_error(request,error):return JSONResponse({'message':error.detail},error.status_code,headers=error.headers)
@app.get('/health')
async def health():return {'status':'ok'}

async def ask(request,feature,text):
    await quota(request,'ai-hour:'+request.state.identity,10,3600)
    await quota(request,'ai-day:'+request.state.identity,25,86400)
    await quota(request,'ai-global-day',int(os.getenv('GLOBAL_AI_DAILY_LIMIT','200')),86400)
    protection=request.app.state.protection; lease='clearspace:busy:'+request.state.identity;owner=secrets.token_hex(16)
    if not await protection.acquire(lease,owner,55):raise HTTPException(409,'An AI request is already running')
    try:
        upstream=await request.app.state.http.post(request.app.state.provider,headers={'Authorization':'Bearer '+request.app.state.key,'Accept':'application/json'},json={'model':'deepseek-ai/deepseek-v4.1-flash','messages':[{'role':'system','content':request.app.state.prompts[feature]},{'role':'user','content':text}],'temperature':0.1,'max_completion_tokens':4096,'reasoning_effort':'none','stream':False})
        if upstream.status_code!=200:
            logger.warning('provider_failed status=%s feature=%s',upstream.status_code,feature)
            raise HTTPException(429 if upstream.status_code==429 else 502,'AI provider could not complete the request')
        # Provider text is untrusted; cap it and reject truncated output.
        if len(upstream.content)>100000:raise ValueError('Output too large')
        choice=upstream.json()['choices'][0]
        if choice.get('finish_reason')=='length':raise ValueError('Truncated response')
        content=choice['message']['content'].strip()
        if content.startswith('```'):content=content.split('\n',1)[1].rsplit('```',1)[0].strip()
        return json.loads(content)
    except HTTPException:raise
    except (httpx.HTTPError,ValueError,KeyError,IndexError,TypeError):raise HTTPException(502,'Invalid or unavailable AI response')
    finally:
        await protection.release(lease,owner)

@app.post('/api/clearspace/organize')
async def organize(input:OrganizeInput,request:Request):
    # PII redaction also applies to drafts; preserve non-header content here.
    safe=await run_in_threadpool(redact,input.transcript,request.app.state.nlp,'__NO_HEADER_DROP__')
    result=await ask(request,'organize',json.dumps({'date':input.date.isoformat(),'transcript':safe},ensure_ascii=False))
    try:
        output=Thoughts.model_validate(result)
        if any(len(step)>500 for item in output.items for step in item.nextSteps):raise ValueError('Invalid steps')
        return output.model_dump(mode='json')
    except ValueError:raise HTTPException(502,'Invalid AI response')

@app.post('/api/clearspace/job-match')
async def job_match(input:JobInput,request:Request):
    try:safe=await run_in_threadpool(redact,input.cv,request.app.state.nlp,input.candidateName)
    except ValueError as error:raise HTTPException(422,str(error))
    # Remove contact/name entities from the job description too.
    job=await run_in_threadpool(redact,input.job,request.app.state.nlp,'__NO_HEADER_DROP__')
    timeline=experience_timeline(safe)
    data=await ask(request,'job-match',json.dumps({'cv':safe,'jobDescription':job,'experienceTimeline':timeline},ensure_ascii=False))
    try:return verify_assessment(data,safe,job)
    except ValueError:raise HTTPException(502,'Unverifiable AI assessment')

def parse_document(content,filename):
    payload=json.dumps({'data':base64.b64encode(content).decode(),'filename':filename})
    try:
        result=subprocess.run([sys.executable,'-m','clearspace.files'],input=payload,text=True,capture_output=True,timeout=10,cwd=str(ROOT.parent))
        if result.returncode:raise ValueError('Cannot safely read this document')
        return json.loads(result.stdout)['text']
    except (subprocess.TimeoutExpired,KeyError,ValueError):raise ValueError('Cannot safely read this document. Use text-based PDF, DOCX or TXT.')

@app.post('/api/clearspace/resume-extract')
async def resume_extract(request:Request,file:UploadFile=File(...)):
    await quota(request,'uploads:'+request.state.identity,10,3600)
    try:
        filename=file.filename or '';content=await file.read(5*1024*1024+1)
        if len(content)>5*1024*1024:raise HTTPException(413,'Maximum upload size is 5 MB')
        text=await run_in_threadpool(parse_document,content,filename)
        safe=await run_in_threadpool(redact,text,request.app.state.nlp)
        return {'text':safe,'redactionNotice':'Automatic redaction can miss names. Review this text and remove any remaining identifiers before running a match.'}
    except ValueError as error:raise HTTPException(422,str(error))
    finally:await file.close()
