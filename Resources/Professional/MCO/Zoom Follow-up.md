## Tech Debt  
- Archive Fetcher   
  - refactor  
  - tests  
  - error reporting - opsgenie notification  
  - Fault tolerance   
    - Network Constraint  
    - DB Bottlenecks  
    - Atomic processing  
    - Backoff Failure Queue  
  - Deployment ( Where are we going to put it? )

- Duplicates in Zoom & ETL ( Vadim to work on )  
- Zoom meeting frontend for review  
- Zoom chat frontend ( Ken working on this )  
- Media player needs to have controls changed to custom stuff and cross browser support added  
- Participant Assignment Pipeline ( Speaker_0, Speaker_1, ect..., computer vision ( tesseract ) , zoom transcript )  
- Make sure the SFTP capture supports all sources, including dumping to the zoom bucket


## From Sean
- Private Message handling
- Add Meeting to Collection - from list and details
- Usability Feedback:
    - Meeting name in search list. 
    - Ability to search for meetings by meeting name.
    - Differentiate transcript dialog from chat in the search list
    - Meeting metadata in the details: start time, end time, duration
    - Style inconsistencies between transcript and chat, namely font size and spacing
    - Should consider showing the id with the name in transcript / chat, e.g. Sean Sullivan (sean.sullivan@blah.com) so that we know who is a known user versus guest easily.

## Vadim

1. Ability to correctly determine participants based on their meeting join and leave time. Additionally, check what data do we get if someone joins and leaves and then joins again and leaves again.  
2. Handling private messages. Also, generating thread id for private messages. Are we treating them as absolutely out of context of a meeting or do we want to integrate them into the common meeting flow?   
3. Zoom chat archive files sometimes fails to specify the message as a reply. It's not our fault, but we gotta talk to Zoom about it if we have a chance.  
4. Ask Zoom about their plans and timelines on generating transcription for Zoom archive, or at least providing us a per-speaker audio in the archive. Because right now Zoom archive only supports the single audio track per meeting.  
5. Transcribe and determine the active speaker from the archived video via computer vision? I would rather not go this way unless we absolutely have to to get a contract with XOM.  
6. Should we assign the same thread id to the chat and transcription?  
7. Technicalities: Check if one can send a tab character into a chat and if it will break a parser.  
8. Breakaway meetings?  
9. Zoom phone?

10. Web hooks for new meetings notification?

## Giorgio 

* CI/CD pipeline for fetcher