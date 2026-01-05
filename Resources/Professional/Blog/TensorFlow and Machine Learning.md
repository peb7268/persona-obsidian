
<div class="post">
	<h1>TensorFlow and Machine Learning</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h2 id&#x3D;&quot;whatisatensor&quot;&gt;What is a tensor?&lt;/h2&gt;
&lt;p&gt;A tensor is an &lt;em&gt;n-dimension&lt;/em&gt; structure. (a*b) + c&lt;br&gt;
n &#x3D; 0: Single value&lt;br&gt;
n &#x3D; 1: list of values&lt;br&gt;
n &#x3D; 2: matrix of values&lt;/p&gt;
&lt;h2 id&#x3D;&quot;whatisacomputationgraph&quot;&gt;What is a computation graph?&lt;/h2&gt;
&lt;p&gt; &lt;/p&gt;
&lt;h2 id&#x3D;&quot;trainingamodel&quot;&gt;Training a Model&lt;/h2&gt;
&lt;ol&gt;
&lt;li&gt;Prepared Data: 70% of data as sample set to train the model and 30% as test set.&lt;/li&gt;
&lt;li&gt;Inference: function that makes a predictions. Function of a line that fit&#x27;s the data.&lt;/li&gt;
&lt;li&gt;Loss Measurement: which predicts how well we predicted the inference&lt;/li&gt;
&lt;li&gt;Optimizer to Minimize loss&lt;/li&gt;
&lt;/ol&gt;
&lt;p&gt;Difference between prediction and actual value is called &lt;strong&gt;loss&lt;/strong&gt;.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;prepareddata&quot;&gt;Prepared Data&lt;/h2&gt;
&lt;p&gt;Generated house size and price data.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;inferencefunction&quot;&gt;Inference function&lt;/h2&gt;
&lt;p&gt;&lt;code&gt;Price &#x3D; (sizeFactor * size) + priceOffset&lt;/code&gt;&lt;/p&gt;
&lt;h2 id&#x3D;&quot;lossmeasurement&quot;&gt;Loss measurement&lt;/h2&gt;
&lt;p&gt;Our loss measurement will be the &lt;em&gt;Mean square error of a fitted line&lt;/em&gt; through the data.&lt;br&gt;
&lt;em&gt;A perfect line will have &lt;strong&gt;zero&lt;/strong&gt; error&lt;/em&gt;. The goal of the optimizer is to adjust the value over a series of iterations to try and get as close to zero as possible.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;optimizeralgorythim&quot;&gt;Optimizer Algorythim&lt;/h2&gt;
&lt;p&gt;Tensorflow comes packed with optimzer algorythims and for this measurement we will use a &lt;code&gt;Gradient Descent Optimizer&lt;/code&gt;.&lt;/p&gt;
&lt;p&gt;To use the prepared data, we need to put it into tensors to hold the data. Tensorflow datatypes are:&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;constants: constant values&lt;/li&gt;
&lt;li&gt;variables: values adjusted in a graph&lt;/li&gt;
&lt;li&gt;placeholders: used to pass data into a graph&lt;/li&gt;
&lt;/ul&gt;
&lt;/div&gt;
	</div>
</div>

