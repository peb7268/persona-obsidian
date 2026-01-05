---
type: campaign
campaign_name: "{{title}}"
campaign_type: geographic
status: active
created: "{{date:YYYY-MM-DDTHH:mm:ss.SSSZ}}"
updated: "{{date:YYYY-MM-DDTHH:mm:ss.SSSZ}}" 
start_date: "{{date:YYYY-MM-DDTHH:mm:ss.SSSZ}}"
end_date: "{{VALUE:end_date}}"
tags: [campaign, sales, geographic, active]

# Geographic Targeting
target_city: "{{VALUE:city}}"
target_state: "{{VALUE:state}}"
target_radius: {{VALUE:radius}}

# Business Targeting
target_industries: [{{VALUE:industries}}]
min_employees: {{VALUE:min_employees}}
max_employees: {{VALUE:max_employees}}
min_revenue: {{VALUE:min_revenue}}
max_revenue: {{VALUE:max_revenue}}
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
daily_target: {{VALUE:daily_target}}
monthly_pipeline_target: {{VALUE:pipeline_target}}

# A/B Testing
ab_testing_enabled: false
active_variants: 0
---

# {{title}}

## Campaign Overview

**Type:** Geographic Targeting  
**Status:** 🟢 Active  
**Duration:** {{date:YYYY-MM-DD}} - {{VALUE:end_date}}  
**Target:** {{VALUE:city}}, {{VALUE:state}} ({{VALUE:radius}} mile radius)  

---

## Targeting Criteria

### Geographic
- **Primary Location:** {{VALUE:city}}, {{VALUE:state}}
- **Search Radius:** {{VALUE:radius}} miles
- **Market Focus:** Local businesses within target area

### Business Profile
- **Industries:** {{VALUE:industries}}
- **Company Size:** {{VALUE:min_employees}} - {{VALUE:max_employees}} employees
- **Revenue Range:** ${{VALUE:min_revenue}} - ${{VALUE:max_revenue}}
- **Qualification Threshold:** 60+ points

---

## Campaign Goals & Targets

| Metric | Daily Target | Monthly Target | Current |
|--------|-------------|----------------|---------|
| **Prospects Identified** | {{VALUE:daily_target}} | {{VALUE:monthly_target}} | 0 |
| **Contact Attempts** | - | - | 0 |
| **Positive Responses** | - | - | 0 |
| **Qualified Leads** | - | - | 0 |
| **Pipeline Value** | - | ${{VALUE:pipeline_target}} | $0 |

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
WHERE contains(tags, "{{title}}")
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
WHERE contains(tags, "{{title}}")
SORT date DESC
LIMIT 10
```

---

## Campaign Notes

### Strategy Notes
*Document key strategic decisions and reasoning here*

### Market Research Insights
*Record key findings about target market, competitors, and opportunities*

### Optimization Opportunities
*Track ideas for improving campaign performance*

---

## Related Files

**Prospects:** `[Projects/Sales/Prospects]` with tag `{{title}}`  
**Activities:** `[Projects/Sales/Activities]` with tag `{{title}}`  
**Templates:** [[Resources/General/Templates/Sales/Prospect-Profile]]

---

*Campaign created on {{date:YYYY-MM-DD}} - Managed by automated sales system*