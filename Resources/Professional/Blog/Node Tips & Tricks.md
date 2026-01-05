
<div class="post">
	<h1>Node Tips &amp; Tricks</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;&lt;a href&#x3D;&quot;http://www.devthought.com/2012/02/17/npm-tricks/&quot;&gt;http://www.devthought.com/2012/02/17/npm-tricks/&lt;/a&gt;&lt;/p&gt;
&lt;h2 id&#x3D;&quot;requiremodularjsdevelopment&quot;&gt;Require(): Modular JS Development&lt;/h2&gt;
&lt;p&gt;&lt;em&gt;Require&lt;/em&gt; takes the name of the module you want to load. It works by looking first to see if the module is a core module ( like &lt;strong&gt;fs&lt;/strong&gt; or &lt;strong&gt;http&lt;/strong&gt; ). then it looks at the &lt;em&gt;.node_modules&lt;/em&gt; directory and if it&#x27;s not there then it looks in the global namespace.&lt;/p&gt;
&lt;p&gt;In addition, you can use your own local modules. Just use a relative path when you use the require method.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;localvsglobalpackages&quot;&gt;Local vs Global Packages&lt;/h2&gt;
&lt;p&gt;This part gave me a headache to say the least. The trick is, &lt;strong&gt;if you install a module &lt;em&gt;globally&lt;/em&gt;&lt;/strong&gt; you can reference it by just calling it like so:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-js&quot;&gt;#Will run testem
testem
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Note the global path where node modules are installed is:&lt;br&gt;
&lt;code&gt;/usr/local/lib/node_modules/&lt;/code&gt;&lt;/p&gt;
&lt;p&gt;If you install it locally you have to do a crazy path reference like so:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-js&quot;&gt;node ../node_modules/testem/testem.js
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;That is unless you add this next bit of magic to your .bashrc or .profile:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;PATH&#x3D;$HOME:./node_modules/.bin
&lt;/code&gt;&lt;/pre&gt;
&lt;blockquote&gt;
&lt;p&gt;The command above will allow you to run locally installed packages just like you do the globally installed packages.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h2 id&#x3D;&quot;npmtricks&quot;&gt;NPM Tricks&lt;/h2&gt;
&lt;p&gt;To see all the see which packages are installed locally: &lt;code&gt;npm ls&lt;/code&gt; or &lt;code&gt;npm list&lt;/code&gt;.&lt;br&gt;
Freeze your dependencies in a specific state for production: &lt;code&gt;npm shrinkwrap&lt;/code&gt;.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Shrinkwrapping ensures not only your dependencies are at a fixed version, but also the dependencies of your dependencies. Nifty.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;/div&gt;
	</div>
</div>

