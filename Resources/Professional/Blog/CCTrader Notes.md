
<div class="post">
	<h1>CCTrader Notes</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h2 id&#x3D;&quot;architecture&quot;&gt;Architecture&lt;/h2&gt;
&lt;p&gt;apps?&lt;br&gt;
xplat: Platform specific stuff that will be reuseable&lt;br&gt;
libs: Core level, base layer, system platform agnostic stuff.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;webtrader&quot;&gt;Web Trader&lt;/h2&gt;
&lt;p&gt;app.module imports SharedModule &amp;amp; CoreModule.&lt;br&gt;
CoreModule imports CcCoreModule which has a few basic imports like httpClient. The CcCoreModule is in the xplat dir and that also imports another Core Module thats in the libs directory. This one has a log service and includes Nx/NgRedux along with some env stuff and effects.&lt;/p&gt;
&lt;p&gt;SharedModule imports the modules from UIModule which imports some basic UI stuff for angular like the routing module &amp;amp; reactive forms.&lt;br&gt;
Where are the routes for the Routing Module? There are no routes provided in the ui module.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;usefulcommands&quot;&gt;Useful commands&lt;/h2&gt;
&lt;p&gt;&lt;code&gt;ng g feature investments_dashboard --projects&#x3D;nativescript-sandbox --projectOnly --routing&lt;/code&gt;&lt;/p&gt;
&lt;p&gt;&lt;code&gt;ng g feature add-funds --projects&#x3D;nativescript-investments-trader --routing --onlyProject --skipFormat&lt;/code&gt;&lt;/p&gt;
&lt;h4 id&#x3D;&quot;generatingacomponent&quot;&gt;Generating a component&lt;/h4&gt;
&lt;p&gt;&lt;code&gt;ng c name —platforms&#x3D;nativescript —ignoreBase —skipFormat&lt;/code&gt;&lt;br&gt;
You will never use projects flag with component generator here since all components you create should be ready to share across any project&lt;/p&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;https://drive.google.com/file/d/1QkETC5ApB0KjdkKdFLfpHEEGrs-mf1EF/view&quot;&gt;https://drive.google.com/file/d/1QkETC5ApB0KjdkKdFLfpHEEGrs-mf1EF/view&lt;/a&gt;&lt;/p&gt;
&lt;p&gt;&lt;code&gt;&amp;lt;Label col&#x3D;&amp;quot;0&amp;quot; [text]&#x3D;&amp;quot;&#x27;mb-investment-menu-more-price-alerts&#x27; | fonticon&amp;quot; class&#x3D;&amp;quot;mb t-25 c-dark-grey-blue text-center&amp;quot;&amp;gt;&amp;lt;/Label&amp;gt;&lt;/code&gt;&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

