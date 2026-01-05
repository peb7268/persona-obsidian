
<div class="post">
	<h1>Event binding with Delegated Events &amp; Async Dom Manipulation</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;In the olden days of jQuery there were a myriad of ways to bind events in the DOM. You had to take into account things like, is the element always present when the page loads, are things going to be added to the DOM dynamically, and so on. With those things to consider you had tons of options for binding events. There was:&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;&lt;code&gt;.click()&lt;/code&gt; : for quick and dirty binding of regular DOM ready present elements.&lt;/li&gt;
&lt;li&gt;&lt;code&gt;.bind()&lt;/code&gt; : which was just a more flexible version of bind.&lt;/li&gt;
&lt;li&gt;&lt;code&gt;.live()&lt;/code&gt; : for elements that were on the page and potentially would be added to the page later in the future.&lt;/li&gt;
&lt;li&gt;and eventually &lt;code&gt;.on()&lt;/code&gt; which was the one ring to rule them all. On was a unified version of all of the above.&lt;/li&gt;
&lt;/ul&gt;
&lt;p&gt;Each method had their own nuances, pro&#x27;s and cons. As things have progressed though, several of these have been deprecated and jQuery core team has advised the use of &lt;code&gt;on&lt;/code&gt;.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;theabcsofeventbinding&quot;&gt;The ABC&#x27;s of event binding&lt;/h2&gt;
&lt;p&gt;In case you&#x27;re unfamiliar with the in&#x27;s and out&#x27;s of event binding let&#x27;s have a brief refresher. Event binding is when you take a element on the page and specify than when a certain action occurs, you then want the page to perform some other action. When the user clicks a button, I want this method to fire. When they hover over this button, I want it to change color. Event binding the process of tying a method to an an event on the page.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Event binding the process of tying a method to an an event on the page.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Let&#x27;s take a simple example and see how it could be hypothetically bound:&lt;br&gt;
&lt;img src&#x3D;&quot;/content/images/2014/Mar/Screen_Shot_2014_03_15_at_2_15_40_PM.png&quot; alt&#x3D;&quot;&quot;&gt;&lt;/p&gt;
&lt;p&gt;In the above image of this post, when a user clicks on the save draft button, a hypothetical saveDraft method should be called. Let&#x27;s see how we might go about wiring that up conventionally.&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-JavaScript&quot;&gt;//$(id).on(&#x27;event&#x27;, handler)
$(&#x27;#draft&#x27;).on(&#x27;click&#x27;, saveDraft);
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Above, I have annotated the signature. The &lt;code&gt;#draft&lt;/code&gt; is the id of the button to be clicked on. &lt;code&gt;click&lt;/code&gt; is the name of the event that is to be bound and lastly, &lt;code&gt;saveDraft&lt;/code&gt; is the method name that will handle the event.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;The method that will handle the event is known as an event handler.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;This type of binding works for all events that are present on your page when the page is loaded. What happens though when the elements you want to bind aren&#x27;t present when the page first loads? Such as with ajax events, or DOM manipulated actions.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;usingdelegatedeventstobindeventstoasyncelements&quot;&gt;Using delegated events to bind events to async elements.&lt;/h2&gt;
&lt;h4 id&#x3D;&quot;sources&quot;&gt;Sources&lt;/h4&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;https://api.jquery.com/on/&quot;&gt;Jquery&#x27;s .on documentation&lt;/a&gt;&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

