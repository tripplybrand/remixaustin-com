// @vitest-environment node
import { tryToFetchRemixAustinInfo } from "~/models/meetup.server";
import { server } from "../../mocks/server";
import { rest } from "msw";
import type {
  MeetupEvent,
  MeetupGroupByUrlname,
  MeetupGroupResponse,
  MeetupRequestBody,
} from "~/models/meetup.parsing";

const MOCK_EVENT: MeetupEvent = {
  title: "Title",
  shortUrl: "https://short.url",
  venue: {
    name: "Online",
    address: "",
    city: "",
    state: "",
  },
  dateTime: new Date("2022-01-01T01:00:00Z"),
  going: 100,
};

const MOCK_GROUP: MeetupGroupByUrlname = {
  link: "https://group.link",
  memberships: {
    count: 200,
  },
  upcomingEvents: {
    edges: [{ node: MOCK_EVENT }],
  },
};
describe("meetup.server", () => {
  describe("getRemixAustinInfo", () => {
    let lastRequestBody: MeetupRequestBody;

    beforeEach(() => {
      const noOp = () => {};
      vi.spyOn(console, "warn").mockImplementation(noOp);
      server.use(
        rest.post("https://www.meetup.com/gql", async (req, res, context) => {
          lastRequestBody = await req.json();
          const response: MeetupGroupResponse = {
            data: { groupByUrlname: MOCK_GROUP },
          };
          return res(context.status(200), context.json(response));
        })
      );
    });

    it("should call meetup api", async () => {
      const event = await tryToFetchRemixAustinInfo();
      expect(lastRequestBody).toBeDefined();
      expect(lastRequestBody.variables).toEqual({ urlname: "remix-austin" });
      // TODO use gql utils for better assertions
      expect(lastRequestBody.query.includes("groupByUrlname")).toBeTruthy();
      expect(event).toEqual(MOCK_GROUP);
    });

    describe("with a malformed response", () => {
      beforeEach(() => {
        server.use(
          rest.post("https://www.meetup.com/gql", (req, res, context) =>
            res(context.status(200), context.json({ data: {} }))
          )
        );
      });

      it("should return undefined", async () => {
        const info = await tryToFetchRemixAustinInfo();
        expect(info).toBeUndefined();
      });
    });

    describe("with a 500 response", () => {
      beforeEach(() => {
        server.use(
          rest.post("https://www.meetup.com/gql", (req, res, context) => {
            const response: MeetupGroupResponse = {
              data: { groupByUrlname: MOCK_GROUP },
            };
            return res(context.status(500), context.json(response));
          })
        );
      });

      it("should return undefined", async () => {
        const info = await tryToFetchRemixAustinInfo();
        expect(info).toBeUndefined();
      });
    });
  });
});
