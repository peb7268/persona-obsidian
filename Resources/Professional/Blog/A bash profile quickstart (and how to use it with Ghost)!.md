
<div class="post">
	<h1>A bash profile quickstart (and how to use it with Ghost)!</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;We use lots of tools today. Lot&#x27;s of tricky tools. We have selenium, git, Rspec, PHPUnit, grunt, and of course node stuff. As developers we have to SSH in to all kinds of different places, configure all kinds of things, and most importantly, we have to remember how to do it.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;theproblem&quot;&gt;The Problem&lt;/h2&gt;
&lt;p&gt;So that&#x27;s the problem. There is no way to remember everything. Let&#x27;s say by some strange twist of fate you are a freak of science and you happen to actually memorize everything you&#x27;ll ever need as a dev. This brings us to problem two: &lt;em&gt;even small keystrokes &lt;strong&gt;that are needlessly repeated&lt;/strong&gt; can add up substantially over time&lt;/em&gt;. So what&#x27;s a dev to do?&lt;/p&gt;
&lt;h2 id&#x3D;&quot;thesolutionbashprofilestotherescue&quot;&gt;The Solution: BASH profiles to the rescue.&lt;/h2&gt;
&lt;p&gt;A bash profile is the thing that has all your basic unix configs setup. System paths, a few global configs, ect..&lt;/p&gt;
&lt;p&gt;As a developer, we can leverage this awesome tool to our advantage. Best of all, since it&#x27;s common on all *nix systems this learning will carry over to multiple systems.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;The importance of a good bash profile cannot be understated.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;So how does this work? Simple, navigate to your home folder:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;cd ~
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;&lt;em&gt;If you aren&#x27;t a *nix user, the &lt;strong&gt;~&lt;/strong&gt; is a shortcut for the home path&lt;/em&gt;&lt;/p&gt;
&lt;p&gt;Next, open up your &lt;strong&gt;.bash_profile&lt;/strong&gt;. We will use vim to do this:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;sudo vim .bash_profile
&lt;/code&gt;&lt;/pre&gt;
&lt;blockquote&gt;
&lt;p&gt;In vim you must press either i to begin insert mode so you can type things or shift + a to start inserting at the end of a line.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Now to the fun part: Add your own aliases (aka shortcuts) to the file:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;#This is a comment in bash
alias site&#x3D;&#x27;cd /var/www/ghost&#x27;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;When creating an alias in bash the format is: &lt;em&gt;alias keyword&#x3D;&#x27;command&#x27;&lt;/em&gt;.&lt;/p&gt;
&lt;p&gt;Make sure to put no space between the keyword and the command. When you are issuing multiple commands in an alias make sure to end each one with a semicolon like so:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;#I&#x27;m shorthand to start ghost
alias sg&#x3D;&#x27;cd /var/www/ghost; npm start&#x27;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;If you are using a package like forever it might look more like:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;alias sg&#x3D;&#x27;cd /var/www/ghost; NODE_ENV&#x3D;production forever start index.js&#x27;
&lt;/code&gt;&lt;/pre&gt;
&lt;h2 id&#x3D;&quot;conclusion&quot;&gt;Conclusion&lt;/h2&gt;
&lt;p&gt;You may be thinking, that&#x27;s nice but what else can I use these for? Well i&#x27;m glad you asked! I use them to do things like:&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;Starting and stopping Apache, Nginx, XAMPP, ghost ect.&lt;/li&gt;
&lt;li&gt;Making shortcuts to commonly needed SSH locations.&lt;/li&gt;
&lt;li&gt;Shortcuts to my current project or frequently accessed areas.&lt;/li&gt;
&lt;li&gt;augmenting custom package commands to automatically use features I usually like but don&#x27;t want to have to type every time.&lt;/li&gt;
&lt;li&gt;Reloading my bash shell to pick up changes when I change my .bash_profile file.&lt;/li&gt;
&lt;/ul&gt;
&lt;p&gt;Let me leave you with a sample of some of these tasks:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;#With this you can just type rspec myDir or file #and it will behave as normal but with color.
alias rspec&#x3D;&#x27;rspec --color&#x27;

#Shorthand bc every keystroke counts
alias gc&#x3D;&#x27;git commit&#x27;

#Reloading your shell
alias reload&#x3D;&#x27;source ~/.bash_profile
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;If anyone has any questions or comments feel free to reach out on twitter!&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

