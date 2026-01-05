---
type: activity
prospect: "{{VALUE:prospect_name}}"
activity_type: "{{VALUE:activity_type}}"
outcome: "{{VALUE:outcome}}"
date: "{{date:YYYY-MM-DDTHH:mm:ss.SSSZ}}"
duration: {{VALUE:duration}}
agent_responsible: "{{VALUE:agent}}"
created: "{{date:YYYY-MM-DDTHH:mm:ss.SSSZ}}"
updated: "{{date:YYYY-MM-DDTHH:mm:ss.SSSZ}}"
tags: [activity, "{{VALUE:activity_type}}", "{{VALUE:outcome}}", "{{VALUE:agent}}"]

# Impact Tracking
stage_change_from: "{{VALUE:stage_from}}"
stage_change_to: "{{VALUE:stage_to}}"
qualification_score_change: {{VALUE:score_change}}

# Follow-up
follow_up_required: {{VALUE:follow_up_required}}
follow_up_date: "{{VALUE:follow_up_date}}"
follow_up_type: "{{VALUE:follow_up_type}}"

# Automation Status
automated: {{VALUE:automated}}
human_review_required: {{VALUE:review_required}}
human_review_completed: false

# Activity-Specific Metadata
email_opened: {{VALUE:email_opened}}
email_clicked: {{VALUE:email_clicked}}
email_bounced: {{VALUE:email_bounced}}
email_template: "{{VALUE:email_template}}"

call_duration: {{VALUE:call_duration}}
call_answered: {{VALUE:call_answered}}
voicemail_left: {{VALUE:voicemail_left}}
call_quality: "{{VALUE:call_quality}}"
---

# {{VALUE:activity_type}} Activity - {{VALUE:prospect_name}}

## Activity Summary

**Company:** [[{{VALUE:prospect_name}}]]  
**Activity Type:** {{VALUE:activity_type}}  
**Outcome:** {{VALUE:outcome}}  
**Date:** {{date:YYYY-MM-DD HH:mm}}  
**Duration:** {{VALUE:duration}} minutes  
**Agent:** {{VALUE:agent}}  

---

## Activity Details

### {{VALUE:activity_type}} Summary
{{VALUE:summary}}

### Detailed Notes
{{VALUE:notes}}

---

## Impact & Results

### Pipeline Impact
{% if VALUE:stage_from != VALUE:stage_to %}
**Stage Change:** {{VALUE:stage_from}} → {{VALUE:stage_to}}
{% endif %}

{% if VALUE:score_change != 0 %}
**Qualification Score Change:** {{VALUE:score_change}} points
{% endif %}

### Key Insights Discovered
- {{VALUE:insights}}

### Buying Signals Detected
- {{VALUE:buying_signals}}

### Pain Points Identified  
- {{VALUE:pain_points}}

### Opportunities Identified
- {{VALUE:opportunities}}

---

## Activity-Specific Data

{% if VALUE:activity_type == "email" %}
### Email Metrics
- **Template Used:** {{VALUE:email_template}}
- **Opened:** {% if VALUE:email_opened %}✅ Yes{% else %}❌ No{% endif %}
- **Clicked:** {% if VALUE:email_clicked %}✅ Yes{% else %}❌ No{% endif %}
- **Bounced:** {% if VALUE:email_bounced %}❌ Yes{% else %}✅ No{% endif %}
{% endif %}

{% if VALUE:activity_type == "cold_call" or VALUE:activity_type == "follow_up_call" %}
### Call Details
- **Duration:** {{VALUE:call_duration}} minutes
- **Answered:** {% if VALUE:call_answered %}✅ Yes{% else %}❌ No{% endif %}
- **Voicemail Left:** {% if VALUE:voicemail_left %}✅ Yes{% else %}❌ No{% endif %}
- **Call Quality:** {{VALUE:call_quality}}
{% endif %}

---

## Follow-up Actions

{% if VALUE:follow_up_required %}
### Next Steps Required
- **Follow-up Date:** {{VALUE:follow_up_date}}
- **Follow-up Type:** {{VALUE:follow_up_type}}
- **Status:** ⏳ Pending

### Follow-up Tasks
- [ ] {{VALUE:follow_up_tasks}}

{% else %}
**No immediate follow-up required**
{% endif %}

---

## Agent Performance

### Automation Status
- **Automated Activity:** {% if VALUE:automated %}✅ Yes{% else %}❌ Manual{% endif %}
- **Human Review Required:** {% if VALUE:review_required %}⚠️ Yes{% else %}✅ No{% endif %}
- **Human Review Completed:** {% if VALUE:review_completed %}✅ Yes{% else %}⏳ Pending{% endif %}

### Agent Notes
{{VALUE:agent_notes}}

---

## Context & Background

### Prospect Context
```dataview
TABLE
    pipeline_stage as "Current Stage",
    qualification_score as "Score", 
    updated as "Last Updated"
FROM "Projects/Sales/Prospects"
WHERE company = "{{VALUE:prospect_name}}"
LIMIT 1
```

### Recent Activity History
```dataview  
TABLE
    activity_type as "Type",
    outcome as "Outcome",
    date as "Date",
    agent_responsible as "Agent"
FROM "Projects/Sales/Activities"
WHERE prospect = "{{VALUE:prospect_name}}" AND file.name != this.file.name
SORT date DESC
LIMIT 5
```

---

## Performance Analytics

### Activity Effectiveness
- **Outcome Quality:** {{VALUE:outcome_quality}}/10
- **Conversation Quality:** {{VALUE:conversation_quality}}/10
- **Information Gathered:** {{VALUE:info_gathered}}/10
- **Relationship Building:** {{VALUE:relationship_building}}/10

### Agent Feedback
*Automated analysis results will be recorded here*

---

## Internal Notes

### Strategic Notes
*Record strategic insights about this prospect's approach*

### Technical Notes  
*Document any system issues or optimization opportunities*

### Human Review Notes
{% if VALUE:review_required %}
*Human reviewer comments will be added here*
{% endif %}

---

## Related Files

**Prospect Profile:** [[{{VALUE:prospect_name}}]]  
**Campaign:** [[{{VALUE:campaign_name}}]]  
**Previous Activities:** Use `tag:#{{VALUE:prospect_name}}` to find all activities

---

*Activity recorded on {{date:YYYY-MM-DD HH:mm}} by {{VALUE:agent}}*
*{% if VALUE:automated %}Automated{% else %}Manual{% endif %} activity - Review status: {% if VALUE:review_required %}Required{% else %}Not needed{% endif %}*