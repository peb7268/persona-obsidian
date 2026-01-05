
<div class="post">
	<h1>What is a service class in PHP?</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;When you hear the term service in relation to PHP it can lead to some ambiguity. Like the previous post where we referred to repositories, the term services has several connotations in the world of programming. For example, you have a Service running on your computer like Nginx, or in Windows you also have services and a manager for those. Perhaps in the context of an application you have a &lt;strong&gt;web service&lt;/strong&gt; that exposes some data to a client. The list goes on and on, so what then is a service class?&lt;/p&gt;
&lt;p&gt;As much as I hear this term used in relation to Laravel, it&#x27;s sad to say that this is not something that is readliy explained &lt;em&gt;anywhere&lt;/em&gt; that i&#x27;ve found in the community and so I turned to the next best place. Since Laravel is built a lot on components that come from symfony I found this definition on the symfony site and I ran with it:&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Put simply, a Service is any PHP object that performs some sort of &amp;quot;global&amp;quot; task.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;The article goes on to say that services are generic classes that are built to perform a specific task. For instance, on might have a mailer service or a user creation service. These are tasks that need to be repeated over and over in various places and thus don&#x27;t fit into any one place that well in particular. That makes them good candidates to become a service. Let&#x27;s dig deeper with another definition.&lt;/p&gt;
&lt;p&gt;This definition from &lt;a href&#x3D;&quot;http://programmers.stackexchange.com/questions/132067/difference-between-a-service-class-and-a-helper-class&quot;&gt;Stack Overflow&lt;/a&gt; is particularly useful. The context it refers to is Java but it explains the concept super clear. In this post a SO user says:&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;When code doesn&#x27;t naturally fit into one class or another nicely then you have a candidate for a service.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h3 id&#x3D;&quot;conceptsarenicebutgiveusanexample&quot;&gt;Concepts are nice but give us an example!&lt;/h3&gt;
&lt;p&gt;Ok ok, so let&#x27;s say you&#x27;re building a dashboard app. It pulls data from quizzes that users take. Then it displays them in a secured dashboard. Right off the bat we see we need to have registration, user creation, data management, ect.&lt;/p&gt;
&lt;p&gt;You could just make the user registration code live in you user model, but what happens if you need to register a user somewhere else though? Let&#x27;s look at the two different approaches.&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-php&quot;&gt;//User.php
...
public function store()
{
	$user  &#x3D; array();
    $user[&#x27;username&#x27;] 	&#x3D; Input::get(&#x27;username&#x27;);
    $input[&#x27;email&#x27;] 	&#x3D; Input::get(&#x27;email&#x27;);
    $input[&#x27;password&#x27;] 	&#x3D; Input::get(&#x27;password&#x27;);
    $input[&#x27;password_confirm&#x27;] &#x3D; Input::get(&#x27;password_confirm&#x27;);
	
    User::create($user);
}

&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;&lt;em&gt;This method assumes you&#x27;re doing validation&lt;/em&gt;&lt;/p&gt;
&lt;p&gt;So what&#x27;s the matter witch this approach. Well technically nothing. It works. All of this logic now is tied to one spot inside your store method of your User model. It seems like this is an anwful lot of knowldge that the store method doesn&#x27;t need to know, a lot of knowledge that seems better placed elsewhere. Let&#x27;s look at an alternate approach.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;After all, why should a core feature of your app only be able to be used in one instance, imprisoned inside one method, and inflexible?&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h2 id&#x3D;&quot;serviceswithasmile&quot;&gt;Service*(s)* with a smile :)&lt;/h2&gt;
&lt;p&gt;What would be a more flexible way? Well let&#x27;s explore. You could:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;
&lt;p&gt;Pass an instance of a UserRegistrationServiceInterface through your constructor to your user model and assign it to a property in the User model.&lt;/p&gt;
&lt;/li&gt;
&lt;li&gt;
&lt;p&gt;Then bind an implementation somewhere else.&lt;/p&gt;
&lt;/li&gt;
&lt;/ol&gt;
&lt;p&gt;This style would allow you to have different implementations of services, a standard user vs a admin user for example. You can repeat this code cleanly and concisely anywhere you need registration to take place, your code is loosely coupled and highly cohesive, and best of all it&#x27;s easy to adapt / maintain.&lt;/p&gt;
&lt;p&gt;So how would our User.php store method look after this?&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-php&quot;&gt;...
public function __construct( UserRegistrationServiceInterface $registrar )
{
    $this-&amp;gt;registrar &#x3D; $registrar;
}
public function store()
{
    $this-&amp;gt;registrar-&amp;gt;register(Input::all());
}
&lt;/code&gt;&lt;/pre&gt;
&lt;h2 id&#x3D;&quot;summary&quot;&gt;Summary&lt;/h2&gt;
&lt;p&gt;In short, a service class is code that you construct to perform a global task. It doesn&#x27;t fit natrually into another class do to knowledge / responsibility or other reasons. Examples of services / service like component in Laravel may be the Cache mechanism, The logging component, The IoC container itself, or most vendor loaded items for that matter.&lt;/p&gt;
&lt;p&gt;I hope this made services a little clearer. Im still gettting my feet with them myself and since I didn&#x27;t find much info about them readily availible I hope that this helps some of you.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

