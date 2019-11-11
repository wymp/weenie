Weenie Base
===================================================================

*See https://weenie.kaelshipman.me for a more full-bodied explanation of the weenie framework.*

This is the base package for the Weenie framework. It uses simple interfaces to define the
structure and some of the logic for a typical microservice.

This package is intended to be included by other packages that do the work of actually defining
(slightly) more opinionated implementations of the framework. For example, the `weenie-framework`
package provides concrete implementations for components that actually make up the official
Weenie framework. It then provides those implementations to the code from this package for proper
structuring and gluing.

This package may be used directly by those wishing to provide alternate implementations of the
components that comprise a microservice, like loggers, pub-subs, http clients, etc.
