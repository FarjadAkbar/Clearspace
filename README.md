# Version 2.5: Sessions and scroll awareness

CV & job match is now a sidebar workspace embedded in the planner. Use the toolbar popup to read a job page, then open the sidebar matcher to use the saved draft. It is no longer in Settings.

The calendar shows completed focus/break counts, focused and break minutes, the active session, and today's session history. Stopped sessions are recorded separately from completed counts. Older records without mode are treated as focus. Break records start with this update; prior breaks cannot be reconstructed.

Site blocking is removed from the UI and worker. Optional Scroll awareness supports desktop www.instagram.com, www.facebook.com, and www.youtube.com, with user-granted per-site access. Tick the sites you want, save, and reload their tabs. Mostly-visible videos receive red outlines. Reels/Shorts versus ordinary video views are counted after one second in a visible tab; revisits can count again. These are estimates, not exact scroll counts. Sites can change DOM/player behavior, and embedded/mobile/fullscreen content may not be covered.

Daily site/type aggregates are stored only in extension local storage for up to 90 days. No URLs, video titles, or content are persisted or sent to AI. The content script temporarily uses player source/element identity only to avoid repeated counts of the same active player. Removing an opt-in stops detection and removes red tags in existing tabs. Remove site access through Chrome to revoke permission; uninstall clears local aggregates. This expands disclosed activity tracking on opted-in sites and must be reflected in your Chrome Web Store declarations. Live site detection is not verified yet.

Reload the extension to install the updated permission declaration and worker. Existing task and session records are preserved.

# Version 2.4: Server-managed AI

The extension no longer asks users to connect Hive or enter an API key. It calls `https://decentgatewaysllc.com/api/clearspace/organize` and `/job-match`. Deploy the Laravel example under `laravel-api/` and keep the provider key in the server .env. See `laravel-api/README.md` for installation, CORS, quota controls, and request contracts. The backend is not deployed by these edits. Until deployment, AI calls will return service errors and preserve user drafts. Host access is restricted to decentgatewaysllc.com. Update public privacy disclosures for the server data flow and actual retention practices before publishing.

# Version 2.3: Finish speaking, then organize

ATS reports now show the estimated score, weak/unclear requirements, and up to three truthful improvements. Exact evidence still validates the score internally.

Voice holds recognized final segments until recording ends. Finish & make bullets sends the completed draft to your configured AI connection; review the editable suggestions before saving. Without a key, the connection dialog opens and the draft is preserved. Recognition ending early may still require restarting listening; no AI request runs on recognition errors.

New timer sessions automatically cycle through 25-minute focus, 10-minute break, and another focus session until paused or reset. Focus starts/resumes have a short sound. Background automatic restarts use a bundled sound through an offscreen audio document. Chrome and OS autoplay/audio settings may affect playback. The new offscreen permission is for session-start audio only, not reading webpages. Legacy sessions already running keep their prior completion behavior.

Reload the extension after updating to grant the packaged offscreen capability and refresh its planner.

# Version 2.2: Calendar-first planning

Calendar is now the main workspace, with a month grid, selected-day agenda, deadlines, unscheduled tasks, and focus controls. The sidebar has Calendar, Thought inbox, and Settings. Daily reset and focus history remain accessible from the calendar. Existing task and session data is preserved. Select a date and choose a task under Not scheduled yet to give it a time. Overlap and past-date validation remain in place.

Urdu organization now explicitly preserves Urdu script or Roman Urdu, negation, uncertainty, and related steps without silently translating into English. This improves prompting, not Chrome speech transcription; live recognition and model accuracy still require testing.

Read current job page now targets LinkedIn job-description containers. Open the selected job and expand About the job before capture. It refuses results-list text or missing descriptions rather than treating the job search results as the selected role. Other sites use dedicated description containers or main content; always review before comparing.

Reload the installed extension and refresh its planner to apply these changes. Web Store screenshots from earlier versions should be refreshed before submitting this version.

# Clearspace

## CV & job match (2.1)

Click the extension icon for a compact popup with Brain dump and CV & job match tabs. Pin the extension in Chrome's toolbar for quick access. On a job listing, open the popup, choose CV & job match, then **Read current job page**. This uses temporary active-tab access and only runs when clicked. It does not monitor browsing. Restricted Chrome pages and embedded job descriptions may require manual copying.

Paste your CV or upload a plain-text `.txt` file, then explicitly Save CV to keep it on this device. PDF and Word uploads are not parsed in this release; copy their text into the CV field. The Remove saved CV button clears its stored copy. CV data is separate from planner exports. Job text is retained locally as a draft; review it to remove navigation, unrelated listings, and private content. Saved data is removed when the extension is uninstalled.

**Run job match** sends the shown CV and job description to the configured Hive/provider connection. Connect your own key in planner Settings first, then reopen the matcher. Nothing is analyzed automatically. Remove contact or other private details you do not want transmitted. Update your public privacy policy to disclose CV and job-text processing by the AI provider.

The score is an explained CV-to-job estimate, not an employer ATS score or hiring prediction. Required requirements have weight 2 and preferred requirements weight 1. Met gets full credit, partial gets half, missing/unknown gets none. All requirements need an exact quote in the job text; credited requirements need an exact CV quote. Unsupported CV evidence is downgraded to unknown. Missing CV evidence does not establish a lack of skill. Model judgment can still be wrong; examine the report and only make truthful edits.

Use **Open detailed page** for a roomier view and longer comparisons; opening it carries unsaved CV text via Chrome session memory without silently saving a CV profile. Closing the popup cancels an in-flight request. The standalone page is also available from planner Settings. Current-page capture and live provider analysis require verification in an installed extension; localhost preview only supports pasted inputs and UI checks.

## Version 2: organized thoughts

The planner now separates Today, Thought inbox, Priorities, Day planner, Insights, Daily reset, and Settings. Search or filter your inbox by tasks, ideas, or notes. Edit titles, estimates, deadlines, and next steps; next-step checkboxes stay attached to the parent goal. Existing tasks and focus history are preserved.

### Hive / DeepSeek setup

1. Reload the extension in `chrome://extensions` and refresh the planner.
2. Open **Settings → Connect / change API key**.
3. Defaults match the provided Hive API: base `https://api.thehive.ai/api/v3`, model `deepseek-ai/deepseek-v4.1-flash`.
4. Enter your own Hive Secret Key and allow access to that API host. The IAM policy alone is not a secret key. No real key is shipped in the source. In the installed extension, keys use Chrome's in-memory session storage and survive page refreshes until the browser session ends; browser preview retains the key only in the current page. Keys are not included in exports. Do not distribute a shared provider key in a public extension.
5. Click **Talk & organize**, speak or type a full transcript, stop recording, then choose **Organize my thoughts**. Only that transcript and the local current date go to your selected provider; tasks and history are not sent. Provider charges apply. Ordinary capture does not call AI.
6. Review grouped titles, task/idea/note types, deadlines, and next steps. Edit or deselect suggestions before **Save selected thoughts**. Multiple sentences about one subject should be grouped into one item by the model. The app does not split model suggestions into individual sentences. AI can misunderstand, so review suggestions before accepting.

This is transcript organization, not a speech recognition upgrade: Chrome still transcribes your microphone; Hive's model reads the resulting text. Urdu script, Roman Urdu, and English are supported in the organizing prompt, but accuracy requires live testing with real samples. The live API has not been tested without an actual account key. Browser preview requires the provider to allow cross-origin browser requests; installed Chrome uses optional, user-granted host access. API errors and malformed output preserve the transcript and do not create tasks. Cancelled or changed transcripts cannot save stale suggestions.

The integration uses non-streaming chat completions, `reasoning_effort: none`, and validated JSON output. See [Hive's DeepSeek documentation](https://docs.thehive.ai/docs/deepseek-v41-flash). Model suggestions are shown using DOM text/value properties, not interpreted as HTML or code.

For Chrome Web Store publication, update the privacy policy and disclosure to include transcripts sent to Hive or the configured provider. A public product serving everyone from your account would need a backend with authentication and usage limits; this release supports users bringing their own keys.

A local-first Chrome extension inspired by “Declutter Your Brain.” Capture thoughts, sort them with the Eisenhower matrix, choose two daily highlights, plan time blocks, and track Pomodoro focus sessions.

## Install

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this project folder.
4. Open a new tab for the planner. Click the extension toolbar button for quick capture.

Clearspace replaces the new-tab page. Tasks, sessions, and voice text drafts are saved on your device. It does not read browsing history. Optional voice recognition may send audio to Chrome's speech service. Choosing AI organization sends the transcript to Hive or your configured provider; see the setup and Voice capture sections. Export a JSON backup from Focus journal (voice drafts are separate and not included). Removing the extension removes its stored data.

## Features

- Brain dump with completion, deletion, and priority assignment.
- Four Eisenhower quadrants and a maximum of two active highlights per day.
- Dated time blocks with overlap validation.
- 25-minute focus sessions and 5-minute breaks, with pause and resume.
- Session tracking, including elapsed focus time when resetting or switching modes.
- Background alarm completes sessions when the planner is closed; Chrome must remain running. Notifications depend on OS permissions.
- Focus journal and JSON data export.

## Productivity tools

- Set a task estimate beside each task. Start focus from a task or scheduled block; tracked sessions retain the task and block link. An active session must be reset before switching tasks.
- Focus journal compares task estimates with saved actual focus time. Paused time is excluded. This measures focused work, not browser usage or time away from the timer.
- Set daily available minutes and a buffer in **Room in your day**. Capacity applies to every day and shows when planned work exceeds available time. Completed blocks still count toward daily capacity; delegating or dropping work releases planned time.
- **A gentle reset** lists unfinished highlights and tasks scheduled for today or earlier. Reschedule replaces old blocks for that task; make smaller rewrites the task and removes old blocks; delegate/let go remove its scheduled blocks. Nothing automatically rolls forward. Delegating records your decision; it does not send messages.
- **Protect your attention** accepts domains such as `youtube.com`. Blocking is off by default. Enabling it in the installed extension requests Chrome's optional `declarativeNetRequest` permission. Only new top-level page loads on your chosen domains and their subdomains are blocked while a focus timer is running. Existing pages keep working until reload/navigation. Chrome shows its native blocked-page error; return to the planner to pause or use the five-minute override. Blocks stop on pause, break, reset, or completion. Overrides expire automatically while Chrome is running.
- Localhost preview saves blocker settings but cannot enforce them. Incognito blocking requires manually allowing the extension in incognito. Removing blocking permission disables enforcement.

Reload the extension at `chrome://extensions` after updating these files, then refresh its planner tab. Existing tasks and sessions are preserved.

## Voice capture

Click **Speak your thoughts** beside Capture, or **Speak in Urdu / English** in the toolbar popup. The popup opens the full planner; it never starts listening automatically. Choose Urdu (Pakistan) `ur-PK` (the default), English (Pakistan) `en-PK`, or English (US) `en-US`. Click **Start listening**, allow the microphone when Chrome asks, speak, then click **Stop**. Confirmed phrases append as separate editable lines. Say “next task”, “new task”, “نیا کام”, or “اگلا کام” to insert a separator. Review and correct the text; use Organize to group the whole transcript into reviewed suggestions, or choose Save lines manually to save each nonempty line separately. Items are limited to 500 characters each. Text drafts are retained separately across reloads, including your language choice. Clearspace does not record or save an audio file.

This uses the browser's Web Speech recognition engine and needs no API key. Browser and language availability vary. Chrome may use an online service, requiring internet access and sending microphone audio for recognition. Urdu script is preserved; automatic Roman Urdu conversion and automatic Urdu/English language switching are not provided. Urdu/English code-switching accuracy is not guaranteed. Switch languages between dictation runs for language-heavy thoughts. For reliably stronger multilingual recognition, a separately configured transcription service would need to be evaluated with real Pakistani Urdu/English samples; Hive currently organizes the transcript only; it does not replace Chrome's speech recognizer.

Recognition does not restart automatically after a browser timeout or error. Start another run to continue your existing draft. Closing the voice dialog or leaving the page aborts recognition; confirmed text is retained, but interim/unconfirmed speech may be lost. When recognition is unavailable, the editable list and save flow still work. Microphone and real Urdu/English recognition accuracy require manual testing in desktop Google Chrome; UI and text-processing tests cannot establish accuracy.

Reference: [SpeechRecognition documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## Development checks

No build tools or dependencies. Reload the extension after editing. For a browser-only preview, serve this folder with `python -m http.server 8080`, then open `http://localhost:8080`. Preview uses localStorage and only completes timers while its page is open.

Run `node --test tests/store.test.cjs tests/background.test.cjs tests/productivity.test.cjs tests/blocking-worker.test.cjs tests/voice.test.cjs tests/ai.test.cjs` for storage, alarm, capacity, domain validation, task-time aggregation, blocking-rule, and bilingual voice-text tests. Verify real Chrome rule enforcement and notifications after loading the extension: enable blocking for a test domain, start focus, navigate to it, pause and retry, then test the temporary override and completion.

Blocking uses Chrome's official [declarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest).

## Green theme · 2.5.1
Montserrat headings and Poppins text are bundled locally. Updated store screenshots, green icons, and promo tiles are in store-assets/green. Upload clearspace-extension-2.5.1.zip for this release; use the store-assets ZIP only for listing images.

## Instagram awareness fix · 2.5.3
Saving awareness settings now attaches tracking to already-open authorized tabs. Oversized reels use the available viewport for visibility checks. A red tracking badge confirms connection, and counts remain local. Reload the extension after installing this update, then re-save your selected sites. Automated tests cover tall reels, duplicate injection, hidden tabs, and attachment to open tabs. Live Instagram validation still requires testing the installed extension.
