---**
tags: starred
---
## Stats
- Statistics for processed messages 

## 2 Problem Tickets 
- Ignored senders list: https://honchoworks.atlassian.net/browse/FW-2644 ( ETL )
- ignored text blocks: https://honchoworks.atlassian.net/browse/FW-2643 ( Vadim )  ( 4 points for Vadim, 3 - 4 points for UI )

## Retention
- How long to keep messages in general ( Giorgio to look at bucket policies, Paul to confirm understanding w Atlas )
	- Deterministic search
	- how long to keep messages if review only is enabled
		- Alerts
			- if an alert is found, exclude it from the purge policy
			- if it's a resolved alert what do we do? ( pretend to keep it forever? ) - Sean TBD
		- Model Training
			- if we store embeddings, do we want to keep them indefinitely? - Also TBD from Sean
	- how long to keep messages if a customer requests immediate purging? ( QOL Example )
		- can delete the original comm immediately but would keep the derived UI
		- Keep the derived message if an alert is found, delete it immediately otherwise? 