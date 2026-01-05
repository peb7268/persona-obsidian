
The purpose of this document is to outline my ideas concerning what I call the conversation construction pipeline. 

I see it as a series of multistage steps as part of the ETL pipeline. 

An alert is a text abstraction that highlights a unit of risk for a customer. 
That unit of text doesn't have much value on its own but provides utility when considered in the context of a conversation. 

My proposal is to bucket all communications for a client into certain intervals. 15 minute rollups that live in 1 hour buckets that live in a day. 

## Conversation Pipeline Flow
1. Every X time ( 15 mins ) we grab all the unprocessed messages and apply our heuristics based algo on them to bundle them into conversations. 
2. We then compare those to the rest of the text for a company for that day and bundle them into one corpus. That corpus is what we then compare against to find if any new messages are nominated to be part of a conversation from earlier in the day. If a message token is suggested to be part of a conversation then we nominate it to the user or auto add it to the conversation with a visual indicator it was picked up by our FW assistant. 

## Stage 1: Heuristics Based
-  messages with matching participants within a particular time frame are nominated as a conversation. 

### Shortcomings 
* can't catch stuff for a conversation out side of time frame 
* when participant scope changes but the messages are still part of a conversation has problems. 

## Stage 2 ML based validation and nomination 
Using doc2vec, TF-IDF, pos tagging or whatever we identify:
* Are the topics of two messages related
* does it fall within a Timeframe to make it likely to be part of the same conversation? ( exponential decay of the weight for the time of the conversation )
* participant overlap 

## Stage 3: Exponential back off processing up to 2 weeks
The pipeline process runs widening the window after day 1 to compare up to 2 weeks. 



## Research

There are a few different approaches that can be used to compare two sentences to see if they are part of the same conversation. One approach is to use **semantic similarity**. This involves comparing the meaning of the two sentences to see how similar they are. This can be done by using a variety of techniques, such as **word embedding** and **natural language inference**.

Another approach is to use **coherence**. This involves looking at how the two sentences fit together in terms of their structure and meaning. This can be done by looking at things like **topic**, **coherence relations**, and **lexical cohesion**.

Finally, it is also possible to use **conversational features**. This involves looking at things like **turn-taking**, **topic management**, and **pragmatic markers**. These features can be used to identify the boundaries between conversations and to determine whether two sentences are part of the same conversation.

The best approach to use will depend on the specific application. For example, if you are trying to identify conversations in a large corpus of text, then a semantic similarity approach may be the best option. However, if you are trying to determine whether two sentences are part of the same conversation in a specific context, then a coherence or conversational features approach may be better.

Here are some examples of how these approaches can be used to compare two sentences:

* **Semantic similarity:**

    * Sentence 1: "I went to the store."
    * Sentence 2: "I bought some milk."

These sentences are semantically similar because they both refer to the act of going to the store.

* **Coherence:**

    * Sentence 1: "I went to the store."
    * Sentence 2: "I bought some milk and eggs."

These sentences are coherent because they both follow the same topic (going to the store).

* **Conversational features:**

    * Sentence 1: "Hi, how are you?"
    * Sentence 2: "I'm fine, thanks. How are you?"

These sentences are conversational because they follow the typical turn-taking structure of a conversation.

By using these different approaches, it is possible to accurately determine whether two sentences are part of the same conversation.