**XOM Demo Notes** 8/29/23

* Jeff A DeMuynck - XOM Employee ( DevTeam )
* Alex P Nascimiento ( XOM DevTeam ) - helped create the output on the broker
* Agha - XOM DevTeam
* They have Azure AD and are interested in using that
* Will be using AD groups for those who are monitored
* "Eric will be very happy w the deleted messages"
*  Other company is a legal document review platform but this is a better representation
* Want emoji responses in the future
* They're thinking of doing an API interface in the future. 
* Clarification from the RFI
* Finalizing TC's w Federico
* Lisa - "Looks really really promising to me"
* Zoom Meetings - We ( FW ) get that ourselves - Maybe talk to Jesus / Diego on how we're going to get the data
---


- Retention and Purging Stats Ticket
- 

## Deal Review Management: disclosure



IDP SAML 
Bapiraju - India Manager 

- 90 day plan
	- SSO


* FeatureHub
* 

Atomic Cadence

* [ ] If there's a deal happening, is someone doing something they shouldn't be? Talking about something they shouldn't be. 

* [!] If they send us a "identity & deal packet", how would be go about finding flagged issues?

- [I] Event Schema
      
- [?] False positives
* [?] Who would be the person defining the use cases? JK

=AND(H$5>=$E7,H$5<=$G7)

* [ ] Focus on Event Schema
		- Biz Entities ( Names & their aliases ), Microsoft, msft, ect...
		- Individual Names ( deal participants ), what they **can't** talk about, and who they cannot communicate with. ( the people they cant talk to can change as the deal progresses, IE someone leaves.) Time constraints apply to these rules, once the deal is public, none of these rules apply anymore.
		- Deal details: name of the deal, description?, 
		- Deal setup events: Initial ingestion of deal metadata

## Action Items
- [ ] Paul to take fist pass at event schema and then hand back to Vijay. 
- [?] Once the ingestion happens, and a response comes back from FW, what is the shape of the response. ( Source, nature of the violation, ect.. )
- [?] Who manages the alert once it's generated ? MCO to send alert status changes back to FW? ( MCO has two status: resolve and close )


- [ ] Learning Roadmap in Obsidian
	- [ ] Java
	- [ ] Kotlin
	- [ ] NLP
	- [ ] Rust?


## MCO UI
- components are tightly coupled
- all hand rolled
- not written to be re-used

## UI options
- rewrite components
- give FW a pallette


## Architecture Integration
* What is the timeline by when we want to do this?
* Plan of levels of integration
	* Lipstick
	* API Based integration
	* Nature of deeper integration ( B2B, User based, Native ? )
	* Deeper integration

Use Case #1
* User who's wall crossed on a deal ( Microsoft & oracle  )
	* Make sure they're not discussing deal with anyone 
		* users 
		* nature of the deal ( tailored lexicon )
		* communications
		* Allowed users 
			* Insiders ( mgmt, can see everything )
			* Temp insiders
			* Deal team members

KYTP - Know your third party
* Russ: KYTP Prod manager, Extending KYO in the area of policies
* Rich: Governor ( KYO - know your obligations )


---

## MCO UI / Architecture Integration meeting notes
Connor Sexton - UI Lead for MCO
Vijay   - Main Architect
Flavio - Front End Guru


## Retention and Purging
- Triggered by cron
- Purge offset minimum of 24 hours
- Not needed to save the purge date
- Last purge update takes precedence
- Multiple crons: 1 per customer, not all running at the same time
- Potentially connect to a replica to reduce CPU consumption for primary node when updates are running. @paul to Create a spike for Giorgio to investigate this. 
- Should we make the ui aware of the purge time so a customer cant change the retention when it's already running?

## Should we purge this alert?
- When would we not want to purge an alert
	- When it hasnt been cleared
	- Check the date condition first. 
	- If its part of a case dont purge it?
- @sean If a message is part of a legal hold, do we need to keep the alert tied to it from being purged?




327k annual cost

## Tech Debt To Fix
- [>] Break up docker setup to be guide infrastructure and legacy infra
- [>] setup a sandbox component route
- Staging connection required for local guide dev
- Presentational / Dumb components vs smart components
- Improve the modal service to be able to dispatch different types of modals

- Bring your own Keys
- SSO

DevOps Tasks
* Ephemeral Dev Environments
* Send out a message to Subho & Giorgio on ES Snapshots

## TODO'S Today [!]
- [ ] Consolidate MCO info in KS confluence page
- [ ] 

So dotenv support has been moved to webpack and compile time instead of in the configuration files?
```
const nodeEnv = process.env.NODE_ENV;

const configFileName = `.env.${!nodeEnv || nodeEnv === 'development' ? 'local' : nodeEnv}`;

  

module.exports = { plugins: [new Dotenv({ path: resolve(process.cwd(), '../../config', configFileName) })] };
```



## Architectural Drift Review

What are we missing in ETL?
* Kafka layer between parser and processor ( trigger the processor when the parser finishes )
* Message process metadata - messages parsed, saved, errors
* Cache Client

Data Storage
- rawParsedData - intermediary collection
- Ephemeral clients

Context Decoration