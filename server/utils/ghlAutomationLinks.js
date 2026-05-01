import { enrollContactInWorkflowForLocation } from "../controller/ghl.js";

export const AUTOMATION_KEYS = {
  SIGNUP: "signup",
  CHECKIN: "checkin",
};

export const getLocationAutomationLink = (location, key) => {
  const normalizedKey = `${key || ""}`.trim();
  if (!normalizedKey || !Array.isArray(location?.ghlAutomationLinks)) return null;

  return (
    location.ghlAutomationLinks.find(
      (link) =>
        `${link?.key || ""}`.trim() === normalizedKey &&
        `${link?.workflowId || ""}`.trim()
    ) || null
  );
};

export const runLocationAutomationLink = async ({
  location,
  key,
  user,
  workflowIdFallback = "",
} = {}) => {
  const locationId = `${location?.locationId || ""}`.trim();
  const linkedWorkflowId = `${getLocationAutomationLink(location, key)?.workflowId || ""}`.trim();
  const workflowId = linkedWorkflowId || `${workflowIdFallback || ""}`.trim();

  if (!locationId || !workflowId || !user?.email) {
    return {
      attempted: false,
      success: false,
      reason: "Missing location, workflow, or user email",
    };
  }

  const result = await enrollContactInWorkflowForLocation(locationId, {
    workflowId,
    email: user.email,
    phone: user.phone || "",
    name: user.name || user.email,
  });

  return {
    attempted: true,
    success: true,
    workflowId,
    contactId: result?.contactId || "",
  };
};
