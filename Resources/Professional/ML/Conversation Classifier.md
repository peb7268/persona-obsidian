# Conversation Classifier


## Main Idea
The *corpus of text* that we're referring to is an aggregation of communications across all  communication channels. It will include, at a minimum the json representation of:
1. The timestamp of the communication
2. The participants
3. The contents of the conversation
4. Metadata: to, from, bcc, cc, processing_stage, ect..

It will be an aggregated log that is ingested and appended to every 15 minutes. 


## Conversation Pipeline
1. Heuristics just uses our simple 24 hour sliding window where it has context 24 hours before and 24 hours after