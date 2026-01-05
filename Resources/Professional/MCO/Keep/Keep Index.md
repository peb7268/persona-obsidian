Keep is the new name for archive 

## Current Focus | Data Model

| Issue                                            | Description                                | Notes              |
| ------------------------------------------------ | -------------------------------------- | ----------------------- |
|  |   |  |
| https://honchoworks.atlassian.net/browse/FW-2749 | Part of 2757 - Initil ETL pipeline     | > |

___

## Next Focus | Alerts Inbox & ETL 
Starting week of 3/13

* Sync w Vlad on this - He needs to detect risk ( FW-2628 )
* Sync w Vadim too on the Bragi side ( FW-2830 )

| Issue                                                            | Description | Notes |
| ---------------------------------------------------------------- | ----------- | ----- |
|                                                                  |             |       |
| https://honchoworks.atlassian.net/browse/FW-2628  | Create Alert when risk detected           | -     |

---
## Parking Lot
* Search Criteria: Quick Search for data for any time in the required retention period
	* So basically we would need to store all text in the db
	* How do we keep this fast?
	* If somone searches for a common word like "compliance" from now to the beginning of their history it is expected to take longer
*  We can defer the derrived email ( chain following ticket to R02 )

## Proposed Items to Trim
- Add new customer
	- Talk about scope on add new customer ( Sean mentoned we can defer this if must, push it to CS )
- [>] View original and derrived emails ( new feature ) - about navigate between replies and forwards?
- [>] Same for IM's
- Conversations
- Review the epic [2757](https://honchoworks.atlassian.net/browse/FW-2757) ( need to add these stories to R1 )
	- 2748 is optional


## Risks
* Retention Jobs
	* How do we want them to be architected?
* Data Storage
* Seperation of potential fault areas / concerns
* Basic Search 
	* how do we want this to be architected? ( atlas search ? )
	* Hot data vs cold data


## Open Questions
1. What do we want to trim w Sean?
2. Resources on this? Add Giorgio

## Resources
* [Initial Scope](https://honchoworks.atlassian.net/wiki/spaces/PR/pages/1998848001/Fairwords+Keep+Initial+Launch+Scope) 
* [Release 1](https://honchoworks.atlassian.net/projects/FW/versions/10110/tab/release-report-all-issues)