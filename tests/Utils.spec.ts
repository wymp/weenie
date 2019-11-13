import * as U from "../src/Utils";

describe("Utils", () => {
  it("should null out an object if passed null", () => {
    expect(U.deepmerge({a: "one"}, null)).toBeNull();
  });

  it("should not change an object when passed an undefined second parameter", () => {
    expect(JSON.stringify(U.deepmerge({a: "one"}))).toBe(JSON.stringify({a: "one"}));
  });

  it("should not change an object when passed many undefined parameters", () => {
    expect(JSON.stringify(U.deepmerge({a: "one"}, undefined, undefined, undefined)))
      .toBe(JSON.stringify({a: "one"}));
  });

  it("should successfully null out properties", () => {
    const res = U.deepmerge({}, {a: "one", b: "two"}, {b: null});
    expect(res.b).toBeNull();
  });

  it("should not modify additional arguments", () => {
    const obj: any = {a: "one", b: "two"};
    const res = U.deepmerge({}, obj, {b: "three"});
    expect(obj.b).toBe("two");
    expect(res.b).toBe("three");
  });

  it("should modify base argument", () => {
    const obj: any = {a: "one", b: "two"};
    const res = U.deepmerge(obj, {b: "three"});
    expect(obj.b).toBe("three");
    expect(res.b).toBe("three");
  });

  it("should correctly merge complex stuff", () => {
    const date1 = new Date("2019-01-01T00:00:00-0000");
    const date2 = new Date("2020-01-01T00:00:00-0000");

    const obj = {
      a: "one",
      b: {
        one: "a",
        two: "b",
        three: [ "a", "b", "c" ],
        four: 4,
        five: true,
        six: {
          i: true,
          ii: false,
          iii: date1,
        }
      }
    };

    const res = U.deepmerge({}, obj, {
      b: {
        two: null,
        three: [ "d", "e" ],
        six: {
          i: false,
          iii: date2
        }
      },
      c: "see"
    });

    expect(res.a).toBe("one");
    expect(res.b.one).toBe("a");
    expect(res.b.two).toBeNull();
    expect(JSON.stringify(res.b.three)).toBe(JSON.stringify(["a","b","c","d","e"]));
    expect(res.b.four).toBe(4);
    expect(res.b.five).toBe(true);
    expect(res.b.six.i).toBe(false);
    expect(res.b.six.ii).toBe(false);
    expect(res.b.six.iii.toString()).toBe(date2.toString());
    expect(res.c).toBe("see");
  });
});
