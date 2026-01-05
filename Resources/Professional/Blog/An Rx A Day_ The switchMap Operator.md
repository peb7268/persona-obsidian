
<div class="post">
	<h1>An Rx A Day: The switchMap Operator</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h4 id&#x3D;&quot;introanrxadaykeepsthecodesmellsaway&quot;&gt;Intro: An Rx A Day keeps the code smells away&lt;/h4&gt;
&lt;p&gt;During a workshop I was at recently, led by the awesome Ben Lesh, I heard that one of the more crucial concepts of RxJs was the concept of &lt;em&gt;merge strategies&lt;/em&gt;. When learning something new, I like to break it down into simple examples and metaphors so I thought I would summarize my reviewing of these concepts in a post series. This series will not be daily, as it will take me time to think of how I want to write these posts, but if you come back weekly you can binge and maybe it could be an Rx a day ;)&lt;/p&gt;
&lt;p&gt;Kicking this series off, i&#x27;d like to talk about the switchMap operator. It&#x27;s an operator that&#x27;s used super frequently and it&#x27;s super useful so I thought i&#x27;d start there.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;whatdoesitdo&quot;&gt;What does it do?&lt;/h4&gt;
&lt;p&gt;Technically switchMap&#x27;s behavior is a combination of behavior from two different operators: &lt;em&gt;map&lt;/em&gt; and &lt;em&gt;switch&lt;/em&gt;.&lt;/p&gt;
&lt;p&gt;Let&#x27;s take a look at each of these in order to get a better idea of how things work. Map works like this:&lt;br&gt;
&lt;a class&#x3D;&quot;jsbin-embed&quot; href&#x3D;&quot;https://jsbin.com/vequgi/embed?html,js,console&quot;&gt;JS Bin on jsbin.com&lt;/a&gt;&lt;script src&#x3D;&quot;https://static.jsbin.com/js/embed.min.js?4.0.2&quot;&gt;&lt;/script&gt;&lt;/p&gt;
&lt;p&gt;The operator map works similar to an array map. It takes each value that an observable emits and applies some function to it, then emits the transformed value into a new observable.&lt;/p&gt;
&lt;p&gt;According to the docs:&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;&amp;quot;Maps each value to an Observable, then flattens all of these inner Observables using switch&amp;quot;&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;What does this mean?&lt;br&gt;
To understand this one must understand the &lt;em&gt;switch&lt;/em&gt; operator.&lt;br&gt;
Let&#x27;s assume we have an outer observable, observable A, it contains two observables, observable B and observable C. Illustrated like so:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;Observable A
0--------------------------------------------------&amp;gt;
        0---b-------b-----b--------b----------b----&amp;gt;
                 0------c----c-----c-----c---c-----&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;/div&gt;
	</div>
</div>

