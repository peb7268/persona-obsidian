
<div class="post">
	<h1>SSH for beginners</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h2 id&#x3D;&quot;definitions&quot;&gt;Definitions&lt;/h2&gt;
&lt;ul&gt;
&lt;li&gt;&lt;strong&gt;known_hosts&lt;/strong&gt; file lets the client authenticate to the server.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;authorized_keys&lt;/strong&gt; file lets the server authenticate the user.&lt;/li&gt;
&lt;/ul&gt;
&lt;h3 id&#x3D;&quot;thehandshake&quot;&gt;The Handshake&lt;/h3&gt;
&lt;p&gt;When the ssh connection is established the server sends its public key to the client.&lt;/p&gt;
&lt;p&gt;The client then tries to match the public key (id_rsa.pub) with the private key (id_rsa).&lt;/p&gt;
&lt;p&gt;Next, the client checks that the server is a known one. This is done by just checking if it has connected before by checking the &lt;em&gt;~/.ssh/known_hosts&lt;/em&gt; file on the client machine.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;known_hosts lives &lt;strong&gt;on the client&lt;/strong&gt;&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;The first time you connect to a server, you need to check by some other means that the public key presented by the server is really the public key of the server you wanted to connect to. If you have the public key of the server you&#x27;re about to connect to, you can add it to ~/.ssh/known_hosts on the client manually.&lt;/p&gt;
&lt;p&gt;By the way, known_hosts can contain any type of public key supported by the SSH implementation, not just DSA (also RSA and ECDSA).&lt;/p&gt;
&lt;h4 id&#x3D;&quot;examplehandshake&quot;&gt;Example Handshake&lt;/h4&gt;
&lt;pre&gt;&lt;code&gt;//Connection is made
server:id_rsa.pub -&amp;gt; client
client:id_rsa &#x3D;&#x3D;&#x3D; server:id_rsa.pub
&lt;/code&gt;&lt;/pre&gt;
&lt;blockquote&gt;
&lt;p&gt;Public Key &lt;strong&gt;server&lt;/strong&gt; private key &lt;em&gt;client&lt;/em&gt;.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Think about it like this. If you&#x27;re ssh&#x27;ing from your computer, you want your password to be stored in a file on your computer. Then like the hint, to be stored on the server. If the hint matches the password then it auths you successfully.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;thefingerprint&quot;&gt;The Fingerprint&lt;/h3&gt;
&lt;p&gt;The SSH fingerprint is based on the &lt;em&gt;public key of the host (server)&lt;/em&gt;&lt;br&gt;
To find the fingerprint of a host, just use the &lt;code&gt;ssh-keyscan &amp;lt;hostname&amp;gt;&lt;/code&gt; command. It goes like this:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;#To verify from the client: 
ssh-keyscan github.com

//and it returns something like:

# github.com:22 SSH-2.0-babeld-7c96ae41
# github.com:22 SSH-2.0-babeld-7c96ae41
github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ&#x3D;&#x3D;
# github.com:22 SSH-2.0-babeld-7c96ae41

&lt;/code&gt;&lt;/pre&gt;
&lt;h3 id&#x3D;&quot;generatingansshkey&quot;&gt;Generating an SSH Key&lt;/h3&gt;
&lt;p&gt;To generate a ssh keypair, you run the following command:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;ssh-keygen -t rsa -b 4096 -C &amp;quot;your_email@example.com&amp;quot;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;When it asks for a passphrase, leave it blank if you don&#x27;t want to have to type a password when authenticating.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;tellyoursystemaboutthesshkey&quot;&gt;Tell your system about the ssh key&lt;/h3&gt;
&lt;p&gt;Once you generate your ssh key, you have to tell your system about it. To do so, first make sure the agent is started with &lt;code&gt;eval &amp;quot;$(ssh-agent -s)&amp;quot;&lt;/code&gt;. Once that is done add the key to the agent by typing &lt;code&gt;ssh-add ~/.ssh/id_rsa&lt;/code&gt; for linux and &lt;code&gt;ssh-add -K ~/.ssh/id_rsa&lt;/code&gt; if on a mac, where id_rsa is the name of your private key. If you named it something else then substitute that key there.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;troublshootingssh&quot;&gt;Troublshooting SSH&lt;/h3&gt;
&lt;ol&gt;
&lt;li&gt;Try a verbose connection:&lt;/li&gt;
&lt;/ol&gt;
&lt;pre&gt;&lt;code&gt;ssh -vT git@github.com
&lt;/code&gt;&lt;/pre&gt;
&lt;ol start&#x3D;&quot;2&quot;&gt;
&lt;li&gt;Verify you have a SSH private key loaded and being used by examining and taking note of your public fingerprint:&lt;/li&gt;
&lt;/ol&gt;
&lt;pre&gt;&lt;code&gt;#OpenSSH 6.7
ssh-add -l
#OpenSSH 6.8+
ssh-add -l -E md5
&lt;/code&gt;&lt;/pre&gt;
&lt;h3 id&#x3D;&quot;resources&quot;&gt;Resources&lt;/h3&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;https://security.stackexchange.com/questions/20706/what-is-the-difference-between-authorized-keys-and-known-hosts-file-for-ssh&quot;&gt;The difference between authorized_keys and known hosts&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;https://superuser.com/questions/1246732/how-to-verify-host-fingerprint-in-openssh&quot;&gt;How to verify host key in OpenSSH&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;https://superuser.com/questions/1377132/get-the-fingerprint-of-an-existing-ssh-public-key&quot;&gt;Get the fingerprint of exisiting public key&lt;/a&gt;&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

