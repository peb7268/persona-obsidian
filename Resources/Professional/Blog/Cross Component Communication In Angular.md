
<div class="post">
	<h1>Cross Component Communication In Angular</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;&lt;strong&gt;Version Disclaimer&lt;/strong&gt;: &lt;em&gt;This is on Angular RC4&lt;/em&gt;&lt;/p&gt;
&lt;p&gt;So when you build an app you have many moving pieces, components if you will.&lt;/p&gt;
&lt;p&gt;The great thing about Angular 2 is it lets you model those relationship in the same tree structure as you would with the usual old style structure of div&#x27;s and li&#x27;s and what not. Let&#x27;s examine this from the perspective of building a dashboard application.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;theoldbrokeness&quot;&gt;The Old Brokeness&lt;/h4&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;div id&#x3D;&amp;quot;dashboard&amp;quot;&amp;gt;
   &amp;lt;div class&#x3D;&amp;quot;chart&amp;quot;&amp;gt;&amp;lt;/div&amp;gt;
   &amp;lt;div class&#x3D;&amp;quot;chart&amp;quot;&amp;gt;&amp;lt;/div&amp;gt;
   &amp;lt;div class&#x3D;&amp;quot;chart&amp;quot;&amp;gt;&amp;lt;/div&amp;gt;
&amp;lt;/div&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;What&#x27;s the problem with this? You have a lot of arbitrary stuff you have to add to the DOM in order to give context so you can attach the needed behavior with JavaScript. What I mean by that, is you need a div for each thing, then a class to bind to, then if you need specificity you have to attach individual ID&#x27;s to each item.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;In short, there is too much arbitrary stuff you have to add to the dom and too many overlapping concerns.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h4 id&#x3D;&quot;thenewhotness&quot;&gt;The New Hotness&lt;/h4&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;dashboard&amp;gt;
   &amp;lt;chart&amp;gt;&amp;lt;/chart&amp;gt;
   &amp;lt;chart&amp;gt;&amp;lt;/chart&amp;gt;
   &amp;lt;chart&amp;gt;&amp;lt;/chart&amp;gt;
&amp;lt;/dashboard&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The benefits from this are many. First, there is neater, cleaner, more descriptive markup. Second, each component is tied to it&#x27;s own class which neatly encapsulates its behavior. This makes separation of concerns much easier.&lt;/p&gt;
&lt;p&gt;That means that a dashboard can handle fetching it&#x27;s own data, a chart can handle fetching it&#x27;s own data and so forth. When you have these nested types of relationships, things built on top of one another, data needs to also be able to be passed in and out of components and between components.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;howdoesitwork&quot;&gt;How does it work?&lt;/h4&gt;
&lt;p&gt;First you have to import the appropriate pieces and tell them about each other.&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;You have a parent component. We&#x27;ll call ours Dashboard.&lt;/li&gt;
&lt;li&gt;You have a child component which you import, Chart.&lt;/li&gt;
&lt;li&gt;You list the child component as a directive of the parent so the parent know&#x27;s it can use the component in it&#x27;s template markup.&lt;/li&gt;
&lt;/ol&gt;
&lt;p&gt;Next, the child component tells the parent component which name it can use to pass data to the child component. That is done like so:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;//Chart component - Tell the parent what name it can use to pass data to the child component.

export class Chart {
   @Input() charttype:string;
}

&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Now let&#x27;s setup the parent element to pass data down to the child component.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;export class Dashboard {  
  defaultCharttype:string &#x3D; &#x27;bar&#x27;;
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;After we tell all the players who&#x27;s who, we finish the process by hooking it up in the actual html through the components attributes like so:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;chart [charttype]&#x3D;&#x27;defaultChartype&#x27;&amp;gt;&amp;lt;/chart&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;h4 id&#x3D;&quot;soletsbreakitdown&quot;&gt;So let&#x27;s break it down.&lt;/h4&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;chart [charttype]&#x3D;&#x27;defaultChartype&#x27;&amp;gt;&amp;lt;/chart&amp;gt;

is the equivalent of:

&amp;lt;childComponent   [childPropertyThatsExposed]&#x3D;&#x27;parentPropertyToBind&#x27;&amp;gt;&amp;lt;/childComponent&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;So to summarize, I will borrow a quite from an excellent article on Sitepoint.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;&amp;quot;A component can receive data from its parent as long &lt;em&gt;as the receiving component has specifically said it is willing to receive data&lt;/em&gt;. &lt;br&gt;&lt;br&gt; Conversely, &lt;em&gt;components can send data to their parents by triggering an event the parent listens for&lt;/em&gt; &amp;quot;&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;In our example, &lt;code&gt;charttype&lt;/code&gt; is what Angular 2 refers to as&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

