
<div class="post">
	<h1>n: The Node Version Manager</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;We PHP developers have been lucky in the past. For the most part, newer versions of PHP haven&#x27;t broken old versions of plugins, scripts, or apps. Most packages and plugins are backwards compatible and having to manage language versions has not even been an afterthought. Other serverside counterparts haven&#x27;t been as fortunate though. If one looks at the language changes between iterations of something like Ruby there are huge changes and many things that cause compatibility issues. Node itself has package compatibility issues. No langauge is perfect, PHP included. So how do you handle this?&lt;/p&gt;
&lt;h2 id&#x3D;&quot;versionmanagement&quot;&gt;Version Management&lt;/h2&gt;
&lt;p&gt;Enter &lt;strong&gt;RVM&lt;/strong&gt; for Ruby. RVM stands for ruby version manager. It nicely keeps and manages multiple versions of the Ruby language as well as gems. PHP unfortunately doesn&#x27;t have something like this. Node on the other hand does. It is called &lt;em&gt;n&lt;/em&gt; and it is written by the same guy who wrote Jade, Mocha, and Express: TJ Holowaychuk.&lt;/p&gt;
&lt;p&gt;You can find the info on &lt;em&gt;n&lt;/em&gt; &lt;a href&#x3D;&quot;https://npmjs.org/package/n&quot;&gt;here&lt;/a&gt;. Essentially it is a swiss army knife for node and you can install it simply by typing: &lt;strong&gt;npm install -g n&lt;/strong&gt;&lt;br&gt;
To get you started I will outline a few of the notables below:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-JavaScript&quot;&gt;//Install a version of node
n &amp;lt;version number&amp;gt; 

//Tells you what the latest stable release is.
n --stable 

//What is the latest bleeding edge release is.
n --latest

//Tells you the bin path for that version of node
n bin &amp;lt;version&amp;gt;

//Uses X.X.X version of node with the arguments you provide.
n use &amp;lt;version&amp;gt; [args ...] 
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;For more info on things just run n -h for the help menu.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

