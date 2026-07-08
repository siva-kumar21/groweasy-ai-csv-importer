import { describe, expect, it } from "vitest";
import { mapRecordsLocally } from "./localMapper.js";

describe("mapRecordsLocally", () => {
  it("maps messy lead fields into GrowEasy CRM records", () => {
    const result = mapRecordsLocally([
      {
        "Lead Created": "2026-05-13 14:20:48",
        "Customer Name": "John Doe",
        "Phone / WhatsApp": "+91 9876543210, +91 9876543219",
        "Email Address": "john@example.com alt@example.com",
        Remarks: "Client asked to reschedule demo",
        Campaign: "Leads on Demand",
        Status: "good follow up"
      }
    ]);

    expect(result.totalImported).toBe(1);
    expect(result.totalSkipped).toBe(0);
    expect(result.records[0]).toMatchObject({
      name: "John Doe",
      email: "john@example.com",
      country_code: "+91",
      mobile_without_country_code: "9876543210",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
      data_source: "leads_on_demand"
    });
    expect(result.records[0].crm_note).toContain("Extra email: alt@example.com");
    expect(result.records[0].crm_note).toContain("Extra mobile: 9876543219");
  });

  it("skips rows without email or mobile", () => {
    const result = mapRecordsLocally([{ Name: "No Contact", City: "Mumbai" }]);

    expect(result.totalImported).toBe(0);
    expect(result.totalSkipped).toBe(1);
    expect(result.skipped[0].reason).toBe("Missing email and mobile number");
  });
});
