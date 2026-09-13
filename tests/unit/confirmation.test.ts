import { describe, expect, it } from "vitest";
import { computePlan } from "@/lib/plan";
import { fieldsToStampOnConfirm, getConfirmationBlockers, type ProfileLike } from "@/lib/confirmation";
import type { OnboardingAnswers } from "@/content";

const NONE: OnboardingAnswers = {
  hasDomain: "no", hasWebsite: "no", hasEmail: "no", hasPhone: "no", hasGBP: "no", hasSocial: "no", hasReviews: "no",
};

const full: ProfileLike = {
  displayName: "Dave's Detail",
  phone: "3035550000",
  email: "dave@example.com",
  hours: { mon: { open: "08:00", close: "18:00" } },
  serviceAreas: ["Aurora"],
  domain: "example.com",
  reviewLink: "https://g.page/r/x/review",
  gbpDescription: "Mobile detailing.",
  streetAddress: null,
  hideAddress: true,
  shortDescription: null,
};

const handyman = computePlan({ trade: "handyman", serviceAreaType: "atCustomer", answers: NONE });
const photographer = computePlan({ trade: "photography", serviceAreaType: "atCustomer", answers: NONE });

describe("§12.3 getConfirmationBlockers", () => {
  it("hideAddress = true with no address → not blocked", () => {
    expect(getConfirmationBlockers(full, handyman)).toEqual([]);
  });
  it("hideAddress = false with no address → blocked on streetAddress, linked to 4.3", () => {
    const b = getConfirmationBlockers({ ...full, hideAddress: false }, handyman);
    expect(b).toEqual([{ fieldKey: "streetAddress", taskId: "4.3" }]);
  });
  it("trade where 6.2 is optional and shortDescription empty → not blocked", () => {
    expect(getConfirmationBlockers(full, handyman)).toEqual([]);
  });
  it("trade where 6.2 is required and shortDescription empty → blocked, linked to 6.2", () => {
    const b = getConfirmationBlockers(full, photographer);
    expect(b).toEqual([{ fieldKey: "shortDescription", taskId: "6.2" }]);
  });
  it("always-required fields block when empty, each linked to its source task", () => {
    const b = getConfirmationBlockers({ ...full, phone: "", reviewLink: null, serviceAreas: [] }, handyman);
    expect(b).toEqual(
      expect.arrayContaining([
        { fieldKey: "phone", taskId: "1.4" },
        { fieldKey: "serviceAreas", taskId: "1.2" },
        { fieldKey: "reviewLink", taskId: "5.1" },
      ]),
    );
    expect(b).toHaveLength(3);
  });
});

describe("§12.3 provenance stamping on confirm", () => {
  it("stamps every tracked field with a value, excluding streetAddress while hidden", () => {
    const fields = fieldsToStampOnConfirm({ ...full, streetAddress: "123 Main", hideAddress: true });
    expect(fields).not.toContain("streetAddress");
    expect(fields).not.toContain("shortDescription"); // empty
    expect(fields).toEqual(
      expect.arrayContaining(["phone", "email", "displayName", "serviceAreas", "hours", "domain", "reviewLink", "gbpDescription"]),
    );
  });
  it("includes streetAddress when shown and set", () => {
    expect(fieldsToStampOnConfirm({ ...full, streetAddress: "123 Main", hideAddress: false })).toContain("streetAddress");
  });
});
