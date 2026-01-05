
<div class="post">
	<h1>What is a repository and how does it work?</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;When I first heard about the term &amp;quot;repository&amp;quot; in reference to code I was throughly confused. Prior to Laravel, the only place I had seen repositories were in the context of SVN or a GIT repo possibly. So what other context is there? What does this term mean in relation to code? A repository is a code abstraction whose purpose is to seperate the knowledge of how data is retrieved from the code that is actually doing the retrieving.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;repositoriesinanutshell&quot;&gt;Repositories in a nutshell&lt;/h2&gt;
&lt;p&gt;To boil it down to simplest terms. Your code that is fetching data shouldn&#x27;t be tied to one specific way of fetching data.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Your client code should have no knowledge of &lt;em&gt;how&lt;/em&gt; data is fetched. It only needs to know how to issue the command to fetch the data.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Using a repository in your code is just a way in to delegate data management responsibilities to a more fitting area of code. It is primarily used as a way to make your code more loosely coupled to it&#x27;s data layer and make it more cohesive.&lt;/p&gt;
&lt;p&gt;You can think of repositories as simply a bridge between your client code and your data layer. Think of a bridge in real life that joins two cliffs. If you want to switch the data layer then it&#x27;s as if one side of the bridge magically twists and connects to a different cliff. Now you have a whole new path but the old path is still there in case you want to switch back.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;repositoriesinactioninlaravel&quot;&gt;Repositories in action in Laravel&lt;/h2&gt;
&lt;p&gt;Enough with the banter. Let&#x27;s take a look at what this looks like in Laravel. For this example, let&#x27;s say you want to work with a group of users.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;dev101way&quot;&gt;Dev 101 way:&lt;/h3&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-php&quot;&gt;//UsersController.php 			
.....
public function index()
{
	$users &#x3D; User::all();
    return View::make(&#x27;users.all&#x27;, compact(&#x27;users&#x27;));
}

public function show($id)
{
     $user &#x3D; User::find($id);
     return View::make(&#x27;users.single&#x27;, compact(&#x27;user&#x27;));
}
.....
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;You might be thinking that looks fine, and you &lt;em&gt;might&lt;/em&gt; be right. It all boils down to how loosely coupled your code needs to be to it&#x27;s data and how many changes you are expecting in the future. In the code above, there are several problems:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;Your controller has intimate knoledge of how the data needs to be fetched. If changes are needed they are needed in many places.&lt;/li&gt;
&lt;li&gt;You are tying yourself to one specific method of fetching data. In this case, the &lt;strong&gt;eloquent ORM&lt;/strong&gt;.&lt;/li&gt;
&lt;/ol&gt;
&lt;h2 id&#x3D;&quot;thejediway&quot;&gt;The Jedi Way&lt;/h2&gt;
&lt;p&gt;A better way to go about retrieving your data is to &lt;em&gt;code to an abstraction&lt;/em&gt;. Pass in, or inject, your data container and then fetch and manipulate against that like so:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-php&quot;&gt;//UserRepositoryInterface.php
interface UserRepositoryInterface {
	public function all();
    public function find();
}

//UserEloquentRepository.php
class UserEloquentRepository implements UserRepositoryInterface {

	public function all()
    {
    	return User::all();
    }

	public function find($uid)
    {
    	return User::find($uid);
    }
	....
}

//UsersController.php
&amp;lt;?php 

class UsersController extends BaseController{
	public $repo;
    public function __construct(UserRepositoryInterface $repo)
     {
    	$this-&amp;gt;repo &#x3D; $repo; 
     }
     
     public function index()
     {
     	$users &#x3D; $this-&amp;gt;repo-&amp;gt;all();
        return View::make(&#x27;users.all&#x27;, compact(&#x27;users&#x27;));
     }
     
     public function find($id)
     {
     	//...
     }
     ....
}
&lt;/code&gt;&lt;/pre&gt;
&lt;h4 id&#x3D;&quot;sowhyisthisbetter&quot;&gt;So Why is this better?&lt;/h4&gt;
&lt;p&gt;Well i&#x27;m glad you asked. Let me count the reasons:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;
&lt;p&gt;Your client code ( The UsersController ) is now &lt;strong&gt;free to use any data source that fits&lt;/strong&gt; (File, Postgres, ect.. ). You are not tied to any specific implementation.&lt;/p&gt;
&lt;/li&gt;
&lt;li&gt;
&lt;p&gt;&lt;strong&gt;Limited Knowledge&lt;/strong&gt;: The client code has no idea what data source it&#x27;s using, only that one is there. Like a child knowing his parents have money, they have the ability to get it, but not knowing how they do their jobs.&lt;/p&gt;
&lt;/li&gt;
&lt;li&gt;
&lt;p&gt;This code is &lt;strong&gt;more testable&lt;/strong&gt;. You can now inject mocks through automatic resolution or using the IoC container.&lt;/p&gt;
&lt;/li&gt;
&lt;/ol&gt;
&lt;p&gt;If the code above seems monsterous don&#x27;t worry. Even though we blended a lot of concepts above if you keep reading and be tenacious I promise you&#x27;ll get it. They aren&#x27;t as scary as they seem.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;wheredidwegetrepo&quot;&gt;Where did we get $repo?&lt;/h2&gt;
&lt;p&gt;I knew you were thinking it, if you weren&#x27;t you should have been! ;) Think about it. The way our code is written, &lt;em&gt;UsersController&lt;/em&gt; is just expected to automatically know what the correct value of &lt;strong&gt;$repo&lt;/strong&gt; is. That would be understandable if the type hint that proceeds it was an actual concrete class, but it isn&#x27;t. The type hint is an interface, an abtraction. If we were to run that code it would fail in it&#x27;s current state.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;entertheioccontainerandautomaticresolution&quot;&gt;Enter the IoC container and automatic resolution&lt;/h3&gt;
&lt;p&gt;Once you have setup your repository and your interface, you have to specidically tell Laravel which concrete class to use when you ask for an intance that implements that interface. You can do that in your routes.php file or in a bindings class that you stick in start.php or somewhere. Check out how:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-php&quot;&gt;//Abstraction / Concrete Class
App::bind(&#x27;UserRepositoryInterface&#x27;, &#x27;UserEloquentRepository&#x27;);
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Now whenever an instance of &lt;em&gt;UserRepositoryInterface&lt;/em&gt; is asked for the IoC container will return a UserEloquentRepository. You could easily switch this one line binding and replace it with a file based approach or something else, implement the interface and BOOM!&lt;/p&gt;
&lt;h3 id&#x3D;&quot;resouces&quot;&gt;Resouces&lt;/h3&gt;
&lt;p&gt;I hope this helped shed some light on how to decouple your data layer from your controllers and logic layer. If you have any questions look me up or leave a comment.&lt;/p&gt;
&lt;p&gt;If you want to continue learning then a simple Google search should do the trick. Beyond that here are some great resources below to paruse.&lt;/p&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;http://net.tutsplus.com/tutorials/php/the-repository-design-pattern/&quot;&gt;Nettuts+ | The Repository Pattern&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;https://laracasts.com/lessons/repositories-simplified&quot;&gt;Laracasts | Repositories Simplified&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;http://laravel.com/docs/ioc&quot;&gt;The IoC container laravel.com&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;http://symfony.com/doc/current/book/service_container.html&quot;&gt;Symfony | Containers and Services&lt;/a&gt;&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

