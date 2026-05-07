import {
  addTagsToContactForLocation,
  enrollContactInWorkflowForLocation,
} from "../controller/ghl.js";

export const AUTOMATION_KEYS = {
  SIGNUP: "signup",
  CHECKIN: "checkin",
};

const parseCsvEnv = (value = "") =>
  `${value || ""}`
    .split(/[,|;]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

const ENV_CHECKIN_TRIGGER_TAGS = Array.from(
  new Set([
    ...parseCsvEnv(process.env.GHL_CHECKIN_TRIGGER_TAGS),
    `${process.env.GHL_CHECKIN_TRIGGER_TAG || ""}`.trim(),
  ].filter(Boolean))
);

const mergeCheckInTriggerTagsFromLinkAndEnv = (link) => {
  const fromLink = Array.isArray(link?.triggerTags)
    ? link.triggerTags.map((t) => `${t || ""}`.trim()).filter(Boolean)
    : typeof link?.triggerTags === "string"
      ? parseCsvEnv(link.triggerTags)
      : [];

  return Array.from(new Set([...fromLink, ...ENV_CHECKIN_TRIGGER_TAGS]));
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
  const normalizedKey = `${key || ""}`.trim();
  const locationId = `${location?.locationId || ""}`.trim();
  const linkRecord = getLocationAutomationLink(location, normalizedKey);
  const linkedWorkflowId = `${linkRecord?.workflowId || ""}`.trim();
  const workflowId = linkedWorkflowId || `${workflowIdFallback || ""}`.trim();
  const checkInTriggerTags =
    normalizedKey === AUTOMATION_KEYS.CHECKIN
      ? mergeCheckInTriggerTagsFromLinkAndEnv(linkRecord)
      : [];

  if (!locationId || !user?.email) {
    return {
      attempted: false,
      success: false,
      reason: "Missing location or user email",
    };
  }

  if (!workflowId && !checkInTriggerTags.length) {
    return {
      attempted: false,
      success: false,
      reason: "Missing workflow configuration",
    };
  }

  let enrollResult = null;
  let enrollmentError = null;

  if (workflowId) {
    try {
      enrollResult = await enrollContactInWorkflowForLocation(locationId, {
        workflowId,
        email: user.email,
        phone: user.phone || "",
        name: user.name || user.email,
      });
    } catch (err) {
      enrollmentError = err;
    }
  }

  let contactId = `${enrollResult?.contactId || ""}`.trim();

  if (normalizedKey === AUTOMATION_KEYS.CHECKIN && checkInTriggerTags.length) {
    try {
      const tagResult = await addTagsToContactForLocation(locationId, {
        contactId,
        tags: checkInTriggerTags,
        email: user.email,
        phone: user.phone || "",
        name: user.name || user.email,
      });
      contactId = `${tagResult?.contactId || contactId || ""}`.trim();

      if (enrollmentError) {
        console.warn(
          "[GHL:CheckInAutomation] Workflow enrollment failed; tag trigger path succeeded",
          {
            locationId,
            email: user.email || "",
            tags: tagResult?.tags || checkInTriggerTags,
            errorMessage:
              enrollmentError?.response?.data?.message ||
              enrollmentError?.message ||
              "",
          }
        );
      }

      return {
        attempted: true,
        success: true,
        workflowId: workflowId || "",
        contactId,
        tagsAdded: tagResult?.tags || checkInTriggerTags,
      };
    } catch (tagError) {
      if (!enrollmentError) {
        throw tagError;
      }
      console.warn("[GHL:CheckInAutomation] Tag trigger failed after enrollment failure", {
        locationId,
        email: user.email || "",
      });
      throw enrollmentError;
    }
  }

  if (enrollmentError) {
    throw enrollmentError;
  }

  return {
    attempted: Boolean(workflowId),
    success: true,
    workflowId,
    contactId,
  };
};
