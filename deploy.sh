#!/usr/bin/env bash
set -e

# ==============================================================================
# Magic Countdown Generator — Production Cloud Deployment Script
# ==============================================================================

export PATH="/Users/aosterloh/.nvm/versions/node/v24.14.0/bin:$HOME/google-cloud-sdk/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

SERVICE_NAME="countdown-maker"
CLOUD_RUN_PROJECT="aosterloh-cs-muc"
CLOUD_RUN_REGION="europe-west1"
FIREBASE_PROJECT="aosterloh-cs-muc"
FIREBASE_SITE="countdown-maker"
AUTH_PROJECT="aosterloh-cs-muc"
GCS_BUCKET_NAME="magic-countdown-generator-aosterloh-cs-muc"
DEPLOY_ACCOUNT="aosterloh@cloudspace.goog"

echo "=================================================================="
echo "🚀 Magic Countdown Generator — Cloud Deployment Orchestrator"
echo "=================================================================="
echo " Cloud Run Project : $CLOUD_RUN_PROJECT ($CLOUD_RUN_REGION)"
echo " Firebase Project  : $FIREBASE_PROJECT ($FIREBASE_SITE.web.app)"
echo " Auth Project      : $AUTH_PROJECT (@google.com only)"
echo " Account           : $DEPLOY_ACCOUNT"
echo "=================================================================="

authorize_domain() {
  local domain="$1"
  if [ -z "$domain" ]; then
    return 0
  fi
  echo "🔒 Authorizing domain '$domain' in Firebase Auth project '$AUTH_PROJECT'..."
  node -e '
  const { execSync } = require("child_process");
  const https = require("https");
  let token = "";
  try {
    token = execSync("export PATH=\"$HOME/google-cloud-sdk/bin:$PATH\"; gcloud auth print-access-token --account='"$DEPLOY_ACCOUNT"'", { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
  } catch (e) {
    try {
      token = execSync("export PATH=\"$HOME/google-cloud-sdk/bin:$PATH\"; gcloud auth print-access-token", { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
    } catch (err) {
      console.warn("⚠️ Could not obtain gcloud access token: " + err.message);
      process.exit(0);
    }
  }
  const project = "'"$AUTH_PROJECT"'";
  const domain = process.argv[1];
  if (!domain) process.exit(0);

  const req = https.request({
    hostname: "identitytoolkit.googleapis.com",
    path: "/admin/v2/projects/" + project + "/config",
    method: "GET",
    headers: { "Authorization": "Bearer " + token, "x-goog-user-project": project }
  }, res => {
    let body = ""; res.on("data", d => body += d);
    res.on("end", () => {
      try {
        const json = JSON.parse(body);
        const domains = new Set(json.authorizedDomains || []);
        if (domains.has(domain)) { console.log("✅ Domain already authorized in Firebase Auth:", domain); return; }
        domains.add(domain);
        const patchData = JSON.stringify({ authorizedDomains: Array.from(domains).sort() });
        const patchReq = https.request({
          hostname: "identitytoolkit.googleapis.com",
          path: "/admin/v2/projects/" + project + "/config?updateMask=authorizedDomains",
          method: "PATCH",
          headers: {
            "Authorization": "Bearer " + token,
            "x-goog-user-project": project,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(patchData)
          }
        }, pRes => {
          console.log(pRes.statusCode === 200 ? "✅ Successfully added " + domain + " to authorized domains" : "⚠️ Failed to add domain (status " + pRes.statusCode + ")");
          pRes.resume();
          process.exit(0);
        });
        patchReq.write(patchData);
        patchReq.end();
      } catch (err) {
        console.warn("⚠️ Error parsing config response:", err.message);
      }
    });
  });
  req.on("error", err => console.warn("⚠️ Domain auth request error:", err.message));
  req.end();
  ' "$domain" 2>/dev/null || true
}

ACTION="${1:-all}"

case "$ACTION" in
  local)
    echo "▶ Starting backend locally on port 3001..."
    npm run server
    ;;

  docker)
    echo "▶ Building Docker container locally..."
    docker build -t "$SERVICE_NAME" .
    echo "▶ Running container on port 8080..."
    docker run -p 8080:8080 --env-file .env "$SERVICE_NAME"
    ;;

  cloudrun)
    echo "▶ Deploying container to Google Cloud Run ($CLOUD_RUN_PROJECT / $CLOUD_RUN_REGION)..."
    gcloud config set account "$DEPLOY_ACCOUNT" --quiet 2>/dev/null || true
    gcloud config set project "$CLOUD_RUN_PROJECT" --quiet 2>/dev/null || true

    # Prepare env file if not exists
    if [ ! -f .env.yaml ]; then
      cat << EOF > .env.yaml
NODE_ENV: "production"
GCP_PROJECT: "${CLOUD_RUN_PROJECT:-aosterloh-cs-muc}"
GCP_REGION: "us-central1"
GCS_BUCKET_NAME: "${GCS_BUCKET_NAME:-magic-countdown-generator-aosterloh-cs-muc}"
GEMINI_API_KEY: "${GEMINI_API_KEY:-}"
EOF
    fi

    CLOUDSDK_METRICS_ENVIRONMENT="${CLOUDSDK_METRICS_ENVIRONMENT:+$CLOUDSDK_METRICS_ENVIRONMENT }datacloud.antigravity" \
    gcloud run deploy "$SERVICE_NAME" \
      --source . \
      --region "$CLOUD_RUN_REGION" \
      --platform managed \
      --allow-unauthenticated \
      --port 8080 \
      --memory 8Gi \
      --cpu 4 \
      --timeout 3600 \
      --project "$CLOUD_RUN_PROJECT" \
      --account "$DEPLOY_ACCOUNT" \
      --env-vars-file .env.yaml

    CR_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$CLOUD_RUN_REGION" --project "$CLOUD_RUN_PROJECT" --account "$DEPLOY_ACCOUNT" --format="value(status.url)" 2>/dev/null || true)
    echo "✅ Cloud Run Service deployed at: $CR_URL"
    if [ -n "$CR_URL" ]; then
      CR_DOMAIN=$(echo "$CR_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
      authorize_domain "$CR_DOMAIN"
    fi
    ;;

  firebase)
    echo "▶ Building frontend bundle..."
    npm run build

    echo "▶ Deploying to Firebase Hosting ($FIREBASE_SITE.web.app)..."
    npx -y firebase-tools deploy --only "hosting:$FIREBASE_SITE" --project "$FIREBASE_PROJECT"

    authorize_domain "$FIREBASE_SITE.web.app"
    authorize_domain "$FIREBASE_SITE.firebaseapp.com"
    echo "🎉 Primary Public HTTPS URL (No 403 Forbidden DRS errors): https://$FIREBASE_SITE.web.app"
    ;;

  all|cloud)
    echo "▶ Step 1/2: Deploying Cloud Run Backend..."
    "$0" cloudrun

    echo "▶ Step 2/2: Building & Deploying Firebase Hosting Gateway..."
    "$0" firebase

    echo "=================================================================="
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo "=================================================================="
    echo "🌍 Primary Public URL: https://$FIREBASE_SITE.web.app"
    echo "ℹ️  (Raw Cloud Run *.run.app URL is blocked by Org DRS; always use the Firebase URL above)"
    echo "=================================================================="
    ;;

  *)
    echo "Usage: $0 [local|docker|cloudrun|firebase|all]"
    exit 1
    ;;
esac
