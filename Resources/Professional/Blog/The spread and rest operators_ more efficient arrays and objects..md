
<div class="post">
	<h1>The spread and rest operators: more efficient arrays and objects.</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;So lately i&#x27;ve been using Redux in one of my Angular app. It has been super fun and super useful to say the least. It takes a little adjusting to get used to their state model and one of the adjustments is the usage of pure functions. In the following post i&#x27;ll illustrate a use case for the spread operator and then show you how to use it.&lt;/p&gt;
&lt;p&gt;Pure functions basically say two things: that you cannot modify / mutate the value of parameters passed into the function and that the return value is derived from the parameters passed in. In essence, a pure function should always have a predictable output given the same set of inputs.&lt;/p&gt;
&lt;p&gt;With that being said, my first question was, &amp;quot;well, how do you modify an array or object without changing it?&amp;quot;, and the answer is to create a new one. Basically, you create a copy of the state you&#x27;re given and then add on the extra info.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;For the purposes of this article we will focus on the theory of the spread operator and not be concerned with creating acutal reducer methods.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h6 id&#x3D;&quot;thechallengelookbutdonttouch&quot;&gt;The challenge - look but don&#x27;t touch&lt;/h6&gt;
&lt;p&gt;Let&#x27;s say we have a function, &lt;code&gt;addItemToArray&lt;/code&gt;. Ingenious name I know! The method function takes an array, and returns a new one without modifying the original array.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;function addItemToArray(initialArrayState &#x3D; [], newValue)
{
   let newStateArray &#x3D; initialArrayState.concat(newValue);

return newStateArray;
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;So this approach is not that bad. We aren&#x27;t mutating the params passed in as we&#x27;re using &lt;code&gt;concat&lt;/code&gt; to return a new array based on the contents of the two arguments. We can do a little better though and make this even shorter and more concise.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;enterthespreadoperator&quot;&gt;Enter the spread operator&lt;/h6&gt;
&lt;pre&gt;&lt;code&gt;function addItemToArray(initialArrayState &#x3D; [], newValue)
{
   return [...initialArrayState, newValue];
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Where the spread operator works by &amp;quot;expanding elements&amp;quot; into new ones such as when you have an expression where you want to be able to add more data, like an array, or function arguments, there is another operator that condenses multiple elements into one.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;therestoperator&quot;&gt;The Rest Operator&lt;/h6&gt;
&lt;p&gt;The rest operator, or aka the &lt;em&gt;object spread operator&lt;/em&gt; let&#x27;s you concatenate values from other objects onto a different object. Let&#x27;s do another example.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;const INITIAL_STATE &#x3D; {&amp;quot;foo&amp;quot; : &amp;quot;bar&amp;quot;};
let newValue &#x3D; {&amp;quot;pet&amp;quot;: &amp;quot;fido&amp;quot;};

function addItemToObj(initialObjState &#x3D; INITIAL_STATE, newValue)
{
   return {...initialObjState, newValue};
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The result of this is a new composed object based on the arguments passed to our function. You can think of this as being similar to jQuery&#x27;s extend or ES2015&#x27;s &lt;code&gt;Object.assign&lt;/code&gt;.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;conclusion&quot;&gt;Conclusion&lt;/h5&gt;
&lt;p&gt;This is just the tip of the iceberg. There is a lot more than you can do with the spread and rest operators. Check out these links below to find out more.&lt;/p&gt;
&lt;p&gt;Resources&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;&lt;a href&#x3D;&quot;http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html&quot;&gt;Using The Object Spread Operator&lt;/a&gt;&lt;/li&gt;
&lt;li&gt;&lt;a href&#x3D;&quot;https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator#Rest_operator&quot;&gt;The Rest Operator&lt;/a&gt;&lt;/li&gt;
&lt;li&gt;&lt;a href&#x3D;&quot;https://davidwalsh.name/spread-operator&quot;&gt;6 Great Uses of the Spread Operator&lt;/a&gt;&lt;/li&gt;
&lt;/ul&gt;
&lt;/div&gt;
	</div>
</div>

