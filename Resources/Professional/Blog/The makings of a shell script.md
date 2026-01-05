
<div class="post">
	<h1>The makings of a shell script</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;Knowing how to work with the base OS that you run your work on has numerous benefit. Any serious developer that has been doing real work has undoubtedly come accross command line utilities on more than an occasion or two. Being able to write a &lt;strong&gt;shell script&lt;/strong&gt; aka a &lt;em&gt;bash script&lt;/em&gt; is a skill that will serve you immensely in your work. So without further ado let&#x27;s dig in!&lt;/p&gt;
&lt;h2 id&#x3D;&quot;theanatomyofashellscript&quot;&gt;The anatomy of a shell script:&lt;/h2&gt;
&lt;p&gt;Bash scripts have the extension &amp;quot;&lt;em&gt;.sh&lt;/em&gt;&amp;quot; . If you are in the terminal &lt;em&gt;cd&lt;/em&gt; to a directory of your choice and make a test script by typing&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;touch test.sh
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Every shell script should begin with the &lt;em&gt;she-bang&lt;/em&gt; line. That wording comes from the fact its a combination of the hash &lt;strong&gt;#&lt;/strong&gt; and the bang (aka exclamation) character &lt;strong&gt;!&lt;/strong&gt;. So lets open up your script and put one in. It looks a little something like this:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;#!/usr/bin/env bash
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Open your script by typing &lt;em&gt;vim test.sh&lt;/em&gt; and then press &lt;em&gt;i&lt;/em&gt; to enter input mode and type your line.&lt;/p&gt;
&lt;p&gt;The above line tells the system to execute the file in the bash shell, bc there are other binaries that could be executed from the command line and other shells.&lt;/p&gt;
&lt;p&gt;Once you have this specified you can fill the body of your script out with any bash valid syntax. Let&#x27;s see what some of that looks like.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;commonbashsyntax&quot;&gt;Common Bash syntax&lt;/h2&gt;
&lt;p&gt;To send info to the cli you &lt;em&gt;echo&lt;/em&gt; something out:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;echo &amp;quot;What is your name?&amp;quot;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Reading input from a question in the console can by done like this:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;read name

#And you access it like so:
echo $name
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;A &lt;em&gt;conditional&lt;/em&gt; is presented like so:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;#Note the spaces near the braces and the semicolon.
if [ &#x27;someVal&#x27; &#x3D; &#x27;someVal&#x27; ]; then
   echo &#x27;Hey it matches&#x27;
fi
#also note the conditional ends with the peculiar fi
&lt;/code&gt;&lt;/pre&gt;
&lt;h2 id&#x3D;&quot;laststepmakeitrun&quot;&gt;Last Step: Make it run!&lt;/h2&gt;
&lt;p&gt;There are of course plenty of other things you can do and I will cover in future additions to this article or perhaps other articles. This should get you started though. Before we call it a night though there is one other thing you have to do: Make your bash script executable:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;sudo chmod +x test.sh
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;See ya next time!&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

