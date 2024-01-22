Weenie API Client - Fetch
========================================================================================================================

> NOTE: This is somewhat experimental and overly-opinionated. See below for more information.

This package is meant to be used with [Weenie](https://npmjs.com/@wymp/weenie-base). However, if you are not using
Weenie but are interested in this functionality, there's nothing wrong with using it directly.

As mentioned above, this package is likely a little over-opinionated. It was originally written to provide a client
for _internal_ API - i.e., APIs that I wrote and that worked in a specific way. It's unlikely that you'll write your
APIs the same way, so this library may not get you very far.

Also, it's due for an upgrade, as API auth handshakes have advanced. This provides a _very simple_ basic auth with a
classic key/secret pair - no hashing or anything else like that.
