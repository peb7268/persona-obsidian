---
type: campaign
campaign_name: "{{VALUE:Campaign Name}}"
campaign_type: geographic
status: active
created: "{{DATE:YYYY-MM-DDTHH:mm:ss.SSSZ}}"
updated: "{{DATE:YYYY-MM-DDTHH:mm:ss.SSSZ}}" 
start_date: "{{DATE:YYYY-MM-DDTHH:mm:ss.SSSZ}}"
end_date: "{{VALUE:End Date (YYYY-MM-DD)}}"
tags: [campaign, sales, geographic, active]

# Geographic Targeting
target_city: "{{VALUE:Target City}}"
target_state: "{{VALUE:Target State}}"
target_radius: {{VALUE:Search Radius (miles)}}

# Business Targeting
target_industries: [{{VALUE:Target Industries (comma-separated, quoted)}}]
min_employees: {{VALUE:Minimum Employees}}
max_employees: {{VALUE:Maximum Employees}}
min_revenue: {{VALUE:Minimum Revenue}}
max_revenue: {{VALUE:Maximum Revenue}}
qualification_threshold: 60

# Campaign Metrics
prospects_identified: 0
contact_attempts: 0
positive_responses: 0
qualified_leads: 0
response_rate: 0
qualification_rate: 0
pipeline_value: 0

# Campaign Goals
daily_target: {{VALUE:Daily Prospect Target}}
monthly_pipeline_target: {{VALUE:Monthly Pipeline Value Target}}

# A/B Testing
ab_testing_enabled: false
active_variants: 0
---

# {{VALUE:Campaign Name}}

## Campaign Overview

**Type:** Geographic Targeting  
**Status:** 🟢 Active  
**Duration:** {{DATE:YYYY-MM-DD}} - {{VALUE:End Date (YYYY-MM-DD)}}  
**Target:** {{VALUE:Target City}}, {{VALUE:Target State}} ({{VALUE:Search Radius (miles)}} mile radius)  

---

## Targeting Criteria

### Geographic
- **Primary Location:** {{VALUE:Target City}}, {{VALUE:Target State}}
- **Search Radius:** {{VALUE:Search Radius (miles)}} miles
- **Market Focus:** Local businesses within target area

### Business Profile
- **Industries:** {{VALUE:Target Industries (comma-separated, quoted)}}
- **Company Size:** {{VALUE:Minimum Employees}} - {{VALUE:Maximum Employees}} employees
- **Revenue Range:** ${{VALUE:Minimum Revenue}} - ${{VALUE:Maximum Revenue}}
- **Qualification Threshold:** 60+ points

---

## Campaign Goals & Targets

| Metric | Daily Target | Monthly Target | Current |
|--------|-------------|----------------|---------|
| **Prospects Identified** | {{VALUE:Daily Prospect Target}} | {{VMATH:VALUE:Daily Prospect Target * 22}} | 0 |
| **Contact Attempts** | - | - | 0 |
| **Positive Responses** | - | - | 0 |
| **Qualified Leads** | - | - | 0 |
| **Pipeline Value** | - | ${{VALUE:Monthly Pipeline Value Target}} | $0 |

---

## Performance Metrics

### Conversion Funnel
```mermaid
graph TD
    A[Prospects Identified: 0] --> B[Contact Attempts: 0]
    B --> C[Positive Responses: 0]
    C --> D[Qualified Leads: 0]
    D --> E[Closed Deals: 0]
```

### Key Performance Indicators
- **Response Rate:** 0% (Target: 15%+)
- **Qualification Rate:** 0% (Target: 5%+)
- **Average Deal Size:** $0 (Target: $3,000)
- **Cost Per Lead:** $0
- **Pipeline Velocity:** 0 days

---

## Messaging Strategy

### Primary Value Proposition
*To be developed based on market research*

### Key Talking Points
1. **Local Market Focus:** Understanding of local business challenges
2. **Digital Marketing ROI:** Measurable results and clear ROI
3. **Competitive Analysis:** Free audit showing gaps vs competition
4. **Proven Process:** Case studies from similar local businesses

### Free Analysis Offer
- **Deliverables:** Competitor comparison, digital presence audit, growth opportunities
- **Value:** $500+ analysis provided free
- **Purpose:** Build trust and demonstrate expertise

---

## A/B Testing Framework

### Current Tests
*No active tests*

### Planned Tests
- [ ] Subject line variations (email)
- [ ] Opening hook variations (calls)
- [ ] Value proposition messaging
- [ ] Call-to-action approaches
- [ ] Follow-up timing intervals

---

## Agent Assignments

| Agent | Role | Status |
|-------|------|--------|
| **Prospecting Agent** | Identify & qualify prospects | Active |
| **Pitch Creator Agent** | Develop customized messaging | Standby |
| **Voice AI Agent** | Make initial contact calls | Standby |
| **Email Agent** | Send follow-up sequences | Standby |

---

## Progress Tracking

### Pipeline Stages
```dataview
TABLE
    company as "Company",
    pipeline_stage as "Stage",  
    qualification_score as "Score",
    updated as "Last Updated"
FROM "Projects/Sales/Prospects"
WHERE contains(tags, "{{VALUE:Campaign Name}}")
SORT qualification_score DESC
```

### Recent Activities
```dataview
TABLE
    prospect as "Company",
    activity_type as "Activity", 
    outcome as "Outcome",
    date as "Date"
FROM "Projects/Sales/Activities" 
WHERE contains(tags, "{{VALUE:Campaign Name}}")
SORT date DESC
LIMIT 10
```

---

## Campaign Strategy Notes

### Market Research Insights
*Record key findings about {{VALUE:Target City}}, {{VALUE:Target State}} market*

### Competitive Landscape
*Document major competitors and market positioning opportunities*

### Messaging Optimization
*Track what messaging resonates with {{VALUE:Target Industries (comma-separated, quoted)}} businesses*

### Performance Optimization
*Record ideas for improving campaign performance*

---

## Related Files

**Prospects:** `[Projects/Sales/Prospects]` with tag `{{VALUE:Campaign Name}}`  
**Activities:** `[Projects/Sales/Activities]` with tag `{{VALUE:Campaign Name}}`  
**Templates:** [[Resources/General/Templates/Sales/Prospect-Profile]]

---

*Campaign created on {{DATE:YYYY-MM-DD}} - Managed by automated sales system*