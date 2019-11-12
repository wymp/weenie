import * as assert from "assert";

import { defaultAuthorizer } from "../src/WebService";
import { SimpleMockDb, MockLogger } from "../src/Test";

const logger = new MockLogger();

describe("WebService", () => {
  describe("auth", () => {
    const mockDb = new SimpleMockDb();
    const authorize = defaultAuthorizer(mockDb, logger);

    it("should pass auth", async () => {
      // Set db to return valid results for 'somekey'
      mockDb.setQueryResult('31ab1bff8ca74529539ade51955ce343', [{
        id: "abcde12345",
        apiKey: "somekey",
        secret: "somesecret",
        partnerId: "aaabbbccc",
        svcName: "Test service",
        svcDesc: "",
        mainWebsite: null,
        requestedScopes: 4095,
        enabled: 1,
        dateCreated: "2018-01-01 00:00:00",
        rateLimit: 500,
        permittedApis: 3
      }]);
      const res = await authorize("somekey", "somesecret");
      assert(res, "authorization result");
    });

    it("should fail auth", async () => {
      // Set db to return no results for 'someotherkey'
      mockDb.setQueryResult('31ab1bff8ca74529539ade51955ce343', []);
      const res = await authorize("someotherkey", "someothersecret");
      assert(!res, "authorization result");
    });
  });
});
