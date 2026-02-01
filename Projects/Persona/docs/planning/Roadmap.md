/Users/pbarrick/Documents/Main/Projects/Persona/docs/planning/Roadmap.md

- [ ] Assistant should intelligently know how to route tasks, questions, ect.. to the right Persona instance. For example, tasks under the ## MHM heading should go to the MHM instance. Tasks under ## Personal or ## MCO should go to the PersonalMCO instance. 
- [ ] Task queuer script that picks up the tasks from the daily note, queues them for work and another agent pulls them off and delegates them to our active model to work on. Coordinates with PO agent to turn the tasks into full PRD's, once approved by me, then the PM coordinates w implementation agent to do the work. 
      
- [ ] Release manager agent
	- Which projects are active, what their release schedule is, what is going out in each release, ect..
- [ ] UX agent for persona, the MHM instance one should define how the design system works per project. How to use the automated storybook extraction process, use agents.md and the prototyping agents,ect. 

- [ ] When a #quote tag is used it should be picked up by the assistant and added to our quote repository in a way that works with the plugin we're using. The author should be picked up as well. 
- [-] BUG: The properties are incorrect for the detailed research note extracted. In the case of /Users/pbarrick/Documents/Main/Resources/Zettlekasten/ADHD Executive Burnout - Prevention and Recovery Guide.md I see commas in the related section. I also see `[[ subject ]]` syntax, I guess for subject interlinking. This probably shouldnt be in the front-matter as it breaks the properties. Maybe this should be in a visual section in the header called "Related Notes: " or something like that. 



* [x] Add a **personal and MCO section under stream of thought** to better organize it.   
* [x] Add a **journal section** under stream of thought

- [x] Clicking the status bar at the bottom will give us an instance list and allow us to toggle between persona instances. ✅ 2025-12-30

* [?] **Roll up questions** you have answered to the week as well. What is the best way to do that with obsidian? Use the new bases thing? Somehow query them as tasks and look for the questions for each daily note?

  - [-] Add a notes section to the daily note template. When extracting notes, move the link bullet down to the notes section
- [-] Is there a way to know **how many tasks** researcher is currently running and what the estimated time is for it to finish? Can we update the toast with more useful info like current question count, ect..? Currently it just keeps popping up with a note saying it's running over and over and not actually filling out the questions in the current note. 
      
- [ ] Tasks syntax enforcement
      
- [ ] **Pickup todos**
	- from days not in the direct previous X days. 14 day default but configurable in env.md
	- fork the plugin?
	  
- [ ] When writing in the daily note, I would like to be able to tag a project with the name like #persona and have the assistant pick it up, cross reference it with the project index /Users/pbarrick/Documents/Main/Projects/Active Projects Index.md and then move the todo to it's proper project file directly and just link back to it in the daily note like we do with note and meeting extraction. That way we can keep the projects, todo's, ect.. organized. 
        
- [ ] **Extract to meeting**
	- highlight the stream of thought entry, or PA ( Persona Assistant ) should be able to see the heading and then grab everything under it and extract it to it's own meeting going to the relevant place. For example, Stalwart Update with [[../../People/Giorgio Catenacci|Giorgio Catenacci]] should be able to pick up this, create a meeting for it based on our button types for the meetings, then I should see it in Today's Meetings. It should function similar to extract to note but also use our CRM worfklow in Obsidian for bi-directional linking between the meeting participants and daily note
	  
- [-] **Extract to note**
	- Should work similar to extract to meeting except it will put it in the Zettlekasten note
	- Should look for a preexisting note instead of just making tons of duplicates
	- Should decide if it's a note or subject
		- For subjects should make a folder in Zettlekasten and include an index.md in the root of the folder before making the atomic note?
		  
- [ ] **Version control** certain parts of the vault and exclude others. 
	- **Include**: Persona, Settings for plugins, Workflow documentation, PKMS, CLAUDE.md. Templates, Home, Mobile Home, Ecomms Home
	- **Exclude** Areas, Archive, Resources/Agenda, Resources/ZettleKasten, Basically everything in Resources not explicitly included by our included. 
	  
- [x] Question Researcher ✅ 2025-12-29
	- Should make the full contents of the question answers in an atomic note in our Zettlekasten folder at the path /Users/pbarrick/Documents/Main/Resources/Zettlekasten
	- Should put the short answer under the question in the daily note along with the link to the zettlekasten entry for the expanded data
	- Won't the question list in the Personal & MCO embed get busy and congested over time?
	- How is the queue cleared over time?
	- What do we do with the question in the daily notes once it's been researched? [?] Doesnt seem like the right icon anymore? Maybe strike though since it has the answer underneath it?





## Scratch

I want to make a Personal instance for Persona.
Im am the VP of Engineering and Also the Director. 
It will be a dual purpose instance to manage my work for both personal life and MCO, my main Job. 

The main role I want is the assistant and researcher. 
I want my daily, weekly, monthly notes maintained, maybe we need to make a quarterly notes template, idk. 

I want it to help me keep those goals on track, focus my stream of thoughts, ect..
* helps me work through my todos and organize my quick notes,
* keep my goals organized and on track.
* Cross references other notes, researches my notes for answers to questions and does web searches to supplement those notes for full understanding on topics. 
* Organize and maintain tags for me so they follow a consitent naming convention in my vault. For example, Sales and sales tags should not exitst, it should lowercase them all. Multi-words should be hyphenated, ect..
* I want to be able to mention projects in my daily note and everything be cross references from my daily note. 
* I want to describe features in my daily note for a project, ideas, ect.. and it get's picked up by my team from Persona and the assistant will give it to the product owner which will fully flesh out the idea / feature, then give it to the project manager and slate it into the Roadmap. 
* I would like to just be able to describe the work i want in my stream of thought in my daily notes and have my persona team pick it up and implement the work in an automated fashion, eventually grow the business automatically, ect..
* I would like to have some kind of UI in the mac menu bar at the top of the screen that shows my persona agents and tasks they have in flight, at the bottom of the menu bar when it's expanded I want to see my cpu and memory currently being consumed by all persona tasks and processes cumulatively. 
* I want to use the tasks plugin and journals plugin as im currently using them in Obsidian and have the assistant enforce conventions ect..


It seems like templates/agents is missing a few things. 
1. in agents/management, do we need a QA manager? Also what about the project manager agent?
2. in agents/ we should have an implementation category where we have architect, developer, ect.. no?

3. Are these agents and workflows running in the background in an autonomous fashion?


Context Stage
The plugins path is: 
*  /Users/pbarrick/Documents/Main/.obsidian/plugins
  
Review:
1. How does journals plugin work? How does it work w the daily note? How does it work on mobile vs obsidian's seperate mobile settings? How does it work and integrate into the workflow with other plugins like templater and quick-add?
2. Which get's invoked first? 
3. Why is my mobile version of the daily note  getting overridden ?

- [-] Journal combined w stream of thought?
- [-] Consolidated MCO & Personal Section, no duplication in page. 
- Append an embed of instructions on how to work the assistant question researcher ect.. where do I put the questions? In stream of thought? In dedicated embed? I want things to work from in my stream of thought and the assistant to pick it up and organize it appropriately. 
  
- Dedicated journal section in my worksace?


Look at the Mobile Home Home Page at /Users/pbarrick/Documents/Main/Mobile Home.md.
1. Remove the heading for quick capture but keep the section. I just want the links. Next, turn the links into more mobile friendly buttons and apply some kind of spacing like space-between flex style. 

2. This today section has a lot of repetition and isnt really useful in it's current state, can we include the heading at the top and on the same line as the heading add a button for open today's daily note? Then under that heading row, can we embed the stream of thought for the daily note?

3. Under quick links, the home link doesnt need to be there, since you're already on the home page. Next, apply the same flex spacing and button styling as task 1.


Is this stuff in the sytax guide:
Syntax Guide:
- [ ] Task description           → Task for today
- [ ] Task ⏫ 📅 2025-01-01      → High priority task with due date
* [?] Research question          → Research queue
* [CB?] Codebase question        → Codebase analysis
* Regular bullet for thoughts    → Stream of consciousness
* [[Person Name]] mentioned      → CRM link

---

## Source
Extracted from: [[2025-12-29]]

## Related
<!-- Add related notes here -->



- [ ] Add in OpenNotebook for learning. 
1. Review the repo at https://github.com/lfnovo/open-notebook with the intent to have it use our obsidian vault as an etl input. Look for any mentions of batch uploading, uploading via a cron, using an api for loading markdown files. 
- Review the docs associated with the repo
- Review the public facing website https://www.open-notebook.ai/ for the same information.
- Do a web search for any relevant information needed as well

Then make me a plan to setup open notebook on my mac and pipe in an array of folder paths from my obsidian vault. 