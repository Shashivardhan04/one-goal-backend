const fbWebhooksController = {};

// Enter the Page Access Token from the previous step
const FACEBOOK_PAGE_ACCESS_TOKEN = "_______________________________";

// Process incoming leads
const processNewLead = async (leadId) => {
  console.log("aman lead Id", leadId);
  return;

  let response;

  try {
    // Get lead details by lead ID from Facebook API
    response = await axios.get(
      `https://graph.facebook.com/v9.0/${leadId}/?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
    );
  } catch (err) {
    // Log errors
    return console.warn(
      `An invalid response was received from the Facebook API:`,
      err.response.data ? JSON.stringify(err.response.data) : err.response
    );
  }

  // Ensure valid API response returned
  if (
    !response.data ||
    (response.data && (response.data.error || !response.data.field_data))
  ) {
    return console.warn(
      `An invalid response was received from the Facebook API: ${response}`
    );
  }

  // Lead fields
  const leadForm = [];

  // Extract fields
  for (const field of response.data.field_data) {
    // Get field name & value
    const fieldName = field.name;
    const fieldValue = field.values[0];

    // Store in lead array
    leadForm.push(`${fieldName}: ${fieldValue}`);
  }

  // Implode into string with newlines in between fields
  const leadInfo = leadForm.join("\n");

  // Log to console
  console.log("A new lead was received!\n", leadInfo);
};

fbWebhooksController.FBGetWebhook = async (req, res) => {
  console.log("webhook ran get");
  try {
    // Facebook sends a GET request
    // To verify that the webhook is set up
    // properly, by sending a special challenge that
    // we need to echo back if the "verify_token" is as specified
    if (req.query["hub.verify_token"] === "AMAN_12345") {
      console.log("verification success");
      res.send(req.query["hub.challenge"]);
      return;
    }
    res.send({success:true});
  } catch (err) {
    console.log("verification failed");
    res.send({success:false});
  }
};

fbWebhooksController.FBPostWebhook = async (req, res) => {
  console.log("webhook ran post");
  try {
    // Facebook will be sending an object called "entry" for "leadgen" webhook event
    console.log("Data entry", req.body.entry);
    res.send({ success: true });
    return;

    if (!req.body.entry) {
      return res.status(500).send({ error: "Invalid POST data received" });
    }

    // Travere entries & changes and process lead IDs
    for (const entry of req.body.entry) {
      for (const change of entry.changes) {
        // Process new lead (leadgen_id)
        await processNewLead(change.value.leadgen_id);
      }
    }

    // Success
    res.send({ success: true });
  } catch (err) {
    console.log("Data entry failed", req.body.entry);
    res.send({ success: false });
    return;
  }
};

// // GET /webhook
// app.get('/webhook', (req, res) => {

// })

// POST /webhook
// app.post('/webhook', async (req, res) => {

// })

module.exports = fbWebhooksController;
