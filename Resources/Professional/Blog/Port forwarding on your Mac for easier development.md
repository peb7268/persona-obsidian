
<div class="post">
	<h1>Port forwarding on your Mac for easier development</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;br&gt;
###Why Port forward?
When doing development for this site I wanted to have a local setup that would run Ghost. This could be done with vagrant and some other goodies, but for the sake of time I just wanted to run ghost and deploy to production.
&lt;p&gt;Typically, the way we do this is to use vagrat, XAMPP, or an equivilant server setup, make an entry in your computers host file, then configure a vhost on apache or nginx to point to the url we want, in this case imperativedesign.net.&lt;/p&gt;
&lt;p&gt;When you run ghost though, it doesn&#x27;s serve requests on &lt;em&gt;port 80&lt;/em&gt; my dev setup serves them on &lt;em&gt;port 2368&lt;/em&gt;. That means you can&#x27;t just add an entry in your host file, and go to imperativedesign.net and be working locally.&lt;/p&gt;
&lt;p&gt;To jump this hurdle we can either suffix the url with &lt;em&gt;:2368&lt;/em&gt; ( which looks ugly ) or we can point port 80 to port 2368. I like the latter approach.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;makingithappen&quot;&gt;Making it happen&lt;/h3&gt;
&lt;p&gt;In the past, I used to use the *nix utility &lt;em&gt;ipfw&lt;/em&gt; but in Yosemite it was deprecated. So that leaves us with port forwading with &lt;strong&gt;anchors&lt;/strong&gt;.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;step1createaforwardingrule&quot;&gt;Step 1: Create a forwarding rule&lt;/h5&gt;
&lt;p&gt;The first step is to create a file that contains forwarding rules.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;#sudo vim /etc/pf.anchors/dev.forwarding
rdr pass on lo0 inet proto tcp from any to 127.0.0.1 port 80 -&amp;gt; 127.0.0.1 port 2368
&lt;/code&gt;&lt;/pre&gt;
&lt;h5 id&#x3D;&quot;step2createaportforwardingconfigfile&quot;&gt;Step2: Create a port forwarding config file&lt;/h5&gt;
&lt;pre&gt;&lt;code&gt;#sudo vim /etc/pf-dev.conf
rdr-anchor &amp;quot;forwarding&amp;quot;
load anchor &amp;quot;forwarding&amp;quot; from &amp;quot;/etc/pf.anchors/eclipse.tomcat.forwarding&amp;quot;

#Note: ^^^ you need an emptly newline at the bottom of the file or it wont work.     
&lt;/code&gt;&lt;/pre&gt;
&lt;h5 id&#x3D;&quot;step3applytherule&quot;&gt;Step 3: Apply the rule&lt;/h5&gt;
&lt;pre&gt;&lt;code&gt;sudo pfctl -ef /etc/pf-dev.conf
&lt;/code&gt;&lt;/pre&gt;
&lt;h5 id&#x3D;&quot;step4lastlyenteraruleinyourhostfile&quot;&gt;Step 4: Lastly enter a rule in your host file&lt;/h5&gt;
&lt;p&gt;This last step ensures all requests to 127.0.0.1 aka localhost go to your mapped port.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;#sudo vim /etc/host
//....Stuff above
127.0.0.1	imperativedesign.net 
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Voila, now anytime I try to go to imperativedesign.net it redirects to my local development environment running on port 2368. You can use this same technique to map local php instances running on something like Nginx and port 8080 or anything else you can think of.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;turningitoffwhenyouredone&quot;&gt;Turning it off when your&#x27;e done&lt;/h2&gt;
&lt;p&gt;The last step is just to turn it off when you finish so requests go to the right place. This is simple, just type:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;sudo pfctl -d

sudo pfctl -F all -f /etc/pf.conf
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The first command flushes our custom config rules.&lt;br&gt;
The next command reload&#x27;s the default mac port configs.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;sources&quot;&gt;Sources:&lt;/h4&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;http://abetobing.com/blog/port-forwarding-mac-os-yosemite-81.html&quot;&gt;http://abetobing.com/blog/port-forwarding-mac-os-yosemite-81.html&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;https://gist.github.com/zhoutong/8adca7038639f0f5fb0e&quot;&gt;https://gist.github.com/zhoutong/8adca7038639f0f5fb0e&lt;/a&gt;&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

