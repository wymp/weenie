import { serviceManagement } from "../src/ServiceManager";
import { Weenie } from "../src/Weenie";

describe("ServiceManager", () => {
  describe("serviceManagement", () => {
    test("should throw error if process takes too long", async () => {
      const result = await new Promise((res, rej) => {
        const r = Weenie({ config: { initializationTimeoutMs: 100 } }).and(serviceManagement);
        r._initTimeout.catch((e) => {
          if (e.message.match(/^INITIALIZATION FAILED/)) {
            res("Correctly timed out");
          } else {
            rej(e);
          }
        });
        setTimeout(() => res("Should have timed out, but didn't"), 500);
      });
      expect(result).toBe("Correctly timed out");
    });

    test("should not throw if properly initialized", async () => {
      const result = await new Promise((res, rej) => {
        const r = Weenie({ config: { initializationTimeoutMs: 100 } })
          .and(serviceManagement)
          .done((d) => { d.initialized(); return { _initTimeout: d._initTimeout } });

        r._initTimeout.catch((e) => {
          if (e.message.match(/^INITIALIZATION FAILED/)) {
            res("Should not have timed out, but did.");
          } else {
            rej(e);
          }
        });
        setTimeout(() => res("Functioned correctly"), 500);
      });
      expect(result).toBe("Functioned correctly");
    });
  });
});
