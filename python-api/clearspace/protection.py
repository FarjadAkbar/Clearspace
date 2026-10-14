"""Persistent atomic quotas and owner-checked leases on one host/local disk."""
import asyncio, sqlite3, time, os
from pathlib import Path
from contextlib import contextmanager, closing

class SQLiteProtection:
    def __init__(self,path):
        self.path=Path(path);self.path.parent.mkdir(parents=True,exist_ok=True)
        with closing(sqlite3.connect(self.path,timeout=5)) as db:
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('CREATE TABLE IF NOT EXISTS quotas (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires REAL NOT NULL)')
            db.execute('CREATE INDEX IF NOT EXISTS quotas_expiry ON quotas(expires)')
            db.execute('CREATE TABLE IF NOT EXISTS leases (key TEXT PRIMARY KEY, owner TEXT NOT NULL, expires REAL NOT NULL)')
            db.commit()
        if os.name!='nt':os.chmod(self.path,0o600)
    @contextmanager
    def transaction(self):
        db=sqlite3.connect(self.path,timeout=5,isolation_level=None)
        try:
            db.execute('BEGIN IMMEDIATE');yield db;db.commit()
        except Exception:db.rollback();raise
        finally:db.close()
    def _increment(self,key,seconds):
        now=time.time()
        with self.transaction() as db:
            db.execute('DELETE FROM quotas WHERE expires<=?',(now,))
            row=db.execute('SELECT count,expires FROM quotas WHERE key=?',(key,)).fetchone()
            count,expires=(row[0]+1,row[1]) if row else (1,now+seconds)
            db.execute('INSERT INTO quotas VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,expires=excluded.expires',(key,count,expires))
            return count,max(1,int(expires-now))
    async def increment(self,key,seconds):return await asyncio.to_thread(self._increment,key,seconds)
    def _acquire(self,key,owner,seconds):
        now=time.time()
        with self.transaction() as db:
            db.execute('DELETE FROM leases WHERE expires<=?',(now,))
            cursor=db.execute('INSERT OR IGNORE INTO leases VALUES(?,?,?)',(key,owner,now+seconds))
            return cursor.rowcount==1
    async def acquire(self,key,owner,seconds):return await asyncio.to_thread(self._acquire,key,owner,seconds)
    def _release(self,key,owner):
        with self.transaction() as db:db.execute('DELETE FROM leases WHERE key=? AND owner=?',(key,owner))
    async def release(self,key,owner):return await asyncio.to_thread(self._release,key,owner)
