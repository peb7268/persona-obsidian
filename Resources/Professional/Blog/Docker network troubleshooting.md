
<div class="post">
	<h1>Docker network troubleshooting</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;&lt;code&gt;docker network ls&lt;/code&gt;&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;[
    {
        &amp;quot;Name&amp;quot;: &amp;quot;main_payaconnectnet&amp;quot;,
        &amp;quot;Id&amp;quot;: &amp;quot;51086b6abca7ffa3544c54d64c4292a3efeecba0ec68d590d7db63820ad8b919&amp;quot;,
        &amp;quot;Created&amp;quot;: &amp;quot;2020-04-02T19:09:01.657805729Z&amp;quot;,
        &amp;quot;Scope&amp;quot;: &amp;quot;local&amp;quot;,
        &amp;quot;Driver&amp;quot;: &amp;quot;bridge&amp;quot;,
        &amp;quot;EnableIPv6&amp;quot;: false,
        &amp;quot;IPAM&amp;quot;: {
            &amp;quot;Driver&amp;quot;: &amp;quot;default&amp;quot;,
            &amp;quot;Options&amp;quot;: null,
            &amp;quot;Config&amp;quot;: [
                {
                    &amp;quot;Subnet&amp;quot;: &amp;quot;172.19.0.0/16&amp;quot;,
                    &amp;quot;Gateway&amp;quot;: &amp;quot;172.19.0.1&amp;quot;
                }
            ]
        },
        &amp;quot;Internal&amp;quot;: false,
        &amp;quot;Attachable&amp;quot;: true,
        &amp;quot;Ingress&amp;quot;: false,
        &amp;quot;ConfigFrom&amp;quot;: {
            &amp;quot;Network&amp;quot;: &amp;quot;&amp;quot;
        },
        &amp;quot;ConfigOnly&amp;quot;: false,
        &amp;quot;Containers&amp;quot;: {
            &amp;quot;0c49262a293f1b342515b4f6d0c4a7ebab6f8d12d01226b6ee8aaa79647c204b&amp;quot;: {
                &amp;quot;Name&amp;quot;: &amp;quot;main_docker-in-docker_1&amp;quot;,
                &amp;quot;EndpointID&amp;quot;: &amp;quot;273bce860afb46cbea11b3515a65cf98a3088812cea2b4f3eb354f6113e767cb&amp;quot;,
                &amp;quot;MacAddress&amp;quot;: &amp;quot;02:42:ac:13:00:03&amp;quot;,
                &amp;quot;IPv4Address&amp;quot;: &amp;quot;172.19.0.3/16&amp;quot;,
                &amp;quot;IPv6Address&amp;quot;: &amp;quot;&amp;quot;
            },
            &amp;quot;5dde5c9c8c0a76a37f6ca6378dca81c88948ba1d52258fcfc8cc1e6add4d57c4&amp;quot;: {
                &amp;quot;Name&amp;quot;: &amp;quot;main_elasticmq_1&amp;quot;,
                &amp;quot;EndpointID&amp;quot;: &amp;quot;85a8dad1a42f4f3fc7f18c21d512545ddf300bca38f08057b274328080b3c853&amp;quot;,
                &amp;quot;MacAddress&amp;quot;: &amp;quot;02:42:ac:13:00:02&amp;quot;,
                &amp;quot;IPv4Address&amp;quot;: &amp;quot;172.19.0.2/16&amp;quot;,
                &amp;quot;IPv6Address&amp;quot;: &amp;quot;&amp;quot;
            },
            &amp;quot;8685d646bffffbcdc8710a2a076ce35e88c95e8b3e4263e7c290f92a49d0e679&amp;quot;: {
                &amp;quot;Name&amp;quot;: &amp;quot;main_payaconnect_1&amp;quot;,
                &amp;quot;EndpointID&amp;quot;: &amp;quot;b0971a601049c18744e540e71dea96dd3da31726338d8e793da1ec35d396b4b5&amp;quot;,
                &amp;quot;MacAddress&amp;quot;: &amp;quot;02:42:ac:13:00:04&amp;quot;,
                &amp;quot;IPv4Address&amp;quot;: &amp;quot;172.19.0.4/16&amp;quot;,
                &amp;quot;IPv6Address&amp;quot;: &amp;quot;&amp;quot;
            }
        },
        &amp;quot;Options&amp;quot;: {},
        &amp;quot;Labels&amp;quot;: {
            &amp;quot;com.docker.compose.network&amp;quot;: &amp;quot;payaconnectnet&amp;quot;,
            &amp;quot;com.docker.compose.project&amp;quot;: &amp;quot;main&amp;quot;,
            &amp;quot;com.docker.compose.version&amp;quot;: &amp;quot;1.25.4&amp;quot;
        }
]
&lt;/code&gt;&lt;/pre&gt;
&lt;/div&gt;
	</div>
</div>

