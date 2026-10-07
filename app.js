const bandwidth = document.getElementById("bandwidth");
const networkLatency = document.getElementById("networkLatency");
const cpu = document.getElementById("cpu");
const privacy = document.getElementById("privacy");
const taskLoad = document.getElementById("taskLoad");
const dataVolume = document.getElementById("dataVolume");
const requiredSpeed = document.getElementById("requiredSpeed");
const edgeAvailability = document.getElementById("edgeAvailability");
const edgeWorkload = document.getElementById("edgeWorkload");
const edgeHealth = document.getElementById("edgeHealth");
const edgeAffordable = document.getElementById("edgeAffordable");
const cloudAvailability = document.getElementById("cloudAvailability");
const runtimeStatus = document.getElementById("runtimeStatus");
const runtimeIssue = document.getElementById("runtimeIssue");
const recoveryPlacement = document.getElementById("recoveryPlacement");
const recoveryControls = document.getElementById("recoveryControls");
const runtimeResult = document.getElementById("runtimeResult");

const bandwidthValue = document.getElementById("bandwidthValue");
const networkLatencyValue = document.getElementById("networkLatencyValue");
const cpuValue = document.getElementById("cpuValue");

const optimizeButton = document.getElementById("optimizeButton");

function updateLabels() {
    bandwidthValue.textContent = bandwidth.value + " Mbps";
    networkLatencyValue.textContent = networkLatency.value + " ms";
    cpuValue.textContent = cpu.value + "%";
}

bandwidth.addEventListener("input", updateLabels);
networkLatency.addEventListener("input", updateLabels);
cpu.addEventListener("input", updateLabels);

function calculatePlacement() {
    const networkBandwidth = Number(bandwidth.value);
    const latency = Number(networkLatency.value);
    const devicePower = Number(cpu.value);
    const speedLimit = {
        low: 200,
        balanced: 100,
        high: 50
    }[requiredSpeed.value];
    const minimumBandwidth = {
        small: 10,
        medium: 40,
        large: 100
    }[dataVolume.value];
    const devicePowerRequired = {
        light: 25,
        medium: 55,
        heavy: 80
    }[taskLoad.value] + (dataVolume.value === "large" ? 10 : 0);
    const deviceSuitable = devicePower >= devicePowerRequired;
    const internetGood = networkBandwidth >= minimumBandwidth && latency <= speedLimit;
    const edgeAvailable = edgeAvailability.value === "yes";
    const edgeHealthy = edgeHealth.value === "healthy" && edgeWorkload.value !== "busy";
    const edgeLatency = latency + {
        small: 8,
        medium: 20,
        large: 40
    }[dataVolume.value];
    const edgeFastAndAffordable = edgeAffordable.value === "yes" && edgeLatency <= speedLimit;
    const cloudAvailable = cloudAvailability.value === "yes";
    const deviceLatency = 110 - (devicePower * 0.45);
    const cloudLatency = (latency * 2) + 70 + (150 / Math.max(networkBandwidth, 1));
    const placements = {
        DEVICE: { name: "DEVICE", latency: deviceLatency, privacy: 0, cost: 0 },
        EDGE: { name: "EDGE", latency: edgeLatency, privacy: 0.02, cost: 0.0008 },
        CLOUD: { name: "CLOUD", latency: cloudLatency, privacy: 0.08, cost: 0.0015 }
    };

    let selected = null;
    let path = "";
    let reason = "";

    if (privacy.value === "high") {
        selected = placements.DEVICE;
        path = "High privacy → Device";
        reason = "High privacy is required, so the task stays on the device.";
    } else if (deviceSuitable) {
        selected = placements.DEVICE;
        path = "Privacy acceptable → Device suitable → Device";
        reason = "The device meets the task's compute requirement.";
    } else if (!internetGood) {
        selected = placements.DEVICE;
        path = "Device unsuitable → Internet poor → Device fallback";
        reason = "The chart routes to the device when internet conditions are poor.";
    } else if (!edgeAvailable) {
        path = "Device unsuitable → Internet good → Edge unavailable → Cloud";
        reason = "Edge is unavailable, so the chart checks cloud as the fallback.";
    } else if (!edgeHealthy) {
        path = "Device unsuitable → Internet good → Edge unhealthy/busy → Cloud";
        reason = "The edge is failed or busy, so cloud is the fallback.";
    } else if (!edgeFastAndAffordable) {
        path = "Device unsuitable → Internet good → Edge too slow/expensive → Cloud";
        reason = "The edge does not meet the speed or affordability condition.";
    } else {
        selected = placements.EDGE;
        path = "Device unsuitable → Internet good → Edge ready → Edge";
        reason = "The edge is available, healthy, fast enough, and affordable.";
    }

    if (!selected && cloudAvailable) {
        selected = placements.CLOUD;
    } else if (!selected) {
        reason = "The chart requires cloud fallback, but cloud is unavailable. No placement can be recommended.";
    }

    return {
        selected,
        placements,
        deviceLatency,
        edgeLatency,
        cloudLatency,
        speedLimit,
        deviceSuitable,
        internetGood,
        edgeAvailable,
        edgeHealthy,
        edgeFastAndAffordable,
        cloudAvailable,
        path,
        reason
    };
}

function setCheck(id, passed, passText = "PASS", failText = "FAIL") {
    const element = document.getElementById(id);
    element.textContent = passed ? passText : failText;
    element.classList.toggle("success", passed);
    element.classList.toggle("failure", !passed);
}

function setBadge(id, text, available) {
    const element = document.getElementById(id);
    element.textContent = text;
    element.classList.toggle("unavailable", !available);
}

function updateUI(overridePlacement = null) {
    const result = calculatePlacement();
    let selected = result.selected;
    let decisionReason = result.reason;
    let decisionPath = result.path;

    if (overridePlacement) {
        const allowed = {
            DEVICE: true,
            EDGE: result.edgeAvailable && result.edgeHealthy && result.edgeFastAndAffordable && result.internetGood && privacy.value !== "high",
            CLOUD: result.cloudAvailable && privacy.value !== "high"
        };
        if (!allowed[overridePlacement]) {
            return false;
        }
        selected = result.placements[overridePlacement];
        decisionReason = "Runtime recovery selected " + overridePlacement + " for the reported issue.";
        decisionPath = "Runtime recovery → " + overridePlacement;
    }

    const placementName = selected ? selected.name : "NO PLACEMENT";
    document.getElementById("selectedPlacement").textContent = placementName;
    document.getElementById("certificatePlacement").textContent = placementName;
    document.getElementById("decisionReason").textContent = decisionReason;
    document.getElementById("decisionPath").textContent = decisionPath;
    document.getElementById("certificatePath").textContent = overridePlacement ? "Runtime recovery" : "Flowchart";
    document.getElementById("gapMetric").textContent = "Flowchart";

    document.getElementById("latencyMetric").textContent = selected ? selected.latency.toFixed(1) + " ms" : "N/A";
    document.getElementById("privacyMetric").textContent = selected ? selected.privacy.toFixed(2) : "N/A";
    document.getElementById("costMetric").textContent = selected ? "$" + selected.cost.toFixed(4) : "N/A";
    document.getElementById("deviceLatency").textContent = result.deviceLatency.toFixed(1) + " ms";
    document.getElementById("edgeLatency").textContent = result.edgeLatency.toFixed(1) + " ms";
    document.getElementById("cloudLatency").textContent = result.cloudLatency.toFixed(1) + " ms";

    const deviceStatus = result.deviceSuitable ? "Suitable" : "Below task requirement";
    const edgeStatus = !result.edgeAvailable ? "Unavailable" : !result.edgeHealthy ? "Busy or failed" : "Available";
    setBadge("deviceAvailability", deviceStatus, result.deviceSuitable);
    setBadge("edgeAvailabilityStatus", edgeStatus, result.edgeAvailable && result.edgeHealthy);
    setBadge("cloudAvailabilityStatus", result.cloudAvailable ? "Available" : "Unavailable", result.cloudAvailable);

    document.querySelectorAll(".placement-card").forEach(card => card.classList.remove("selected"));
    if (selected) {
        document.getElementById(selected.name.toLowerCase() + "Card").classList.add("selected");
    }

    setCheck("feasibilityStatus", Boolean(selected));
    setCheck("latencyStatus", Boolean(selected) && selected.latency <= result.speedLimit, "PASS", selected ? "TARGET MISSED" : "N/A");
    setCheck("privacyStatus", Boolean(selected) && (privacy.value !== "high" || selected.name === "DEVICE"), "PASS", selected ? "FAIL" : "N/A");
    const costPass = selected && (selected.name !== "EDGE" || edgeAffordable.value === "yes");
    setCheck("costStatus", Boolean(costPass), selected ? "PASS" : "N/A", "FAIL");

    addLog(selected ? "Placement selected: " + selected.name : "No placement available: cloud fallback unavailable");
    return Boolean(selected);
}


function addLog(message) {

    const logs = document.getElementById("logs");

    const entry = document.createElement("div");

    entry.className = "log";

    const time =
        new Date().toLocaleTimeString();

    const timestamp = document.createElement("span");
    timestamp.textContent = time;
    entry.append(timestamp, document.createTextNode(message));

    logs.prepend(entry);

}


/* 
    Run optimization 
*/

optimizeButton.addEventListener(
    "click",
    () => updateUI()
);

runtimeStatus.addEventListener("change", () => {
    const needsRecovery = runtimeStatus.value === "no";
    recoveryControls.hidden = !needsRecovery;
    runtimeIssue.required = needsRecovery;
    recoveryPlacement.required = needsRecovery;
    runtimeResult.textContent = needsRecovery ? "CHECK AGAIN: identify the issue and select a recovery placement." : "Ready to start task.";
});

document.getElementById("continueButton").addEventListener("click", () => {
    if (runtimeStatus.value === "yes") {
        const hasPlacement = updateUI();
        runtimeResult.textContent = hasPlacement ?
            "Task started and continues on " + document.getElementById("selectedPlacement").textContent + "." :
            "Task cannot start: no placement is available under the selected conditions.";
        return;
    }

    if (!runtimeIssue.value || !recoveryPlacement.value) {
        runtimeResult.textContent = "Select what went wrong and choose a recovery placement.";
        return;
    }

    const hasPlacement = updateUI(recoveryPlacement.value);
    if (!hasPlacement) {
        runtimeResult.textContent = "That placement is unavailable or violates the privacy requirement. Choose another option.";
        return;
    }

    const issueText = runtimeIssue.options[runtimeIssue.selectedIndex].text;
    runtimeResult.textContent = "Checked again: " + issueText + ". Task continues on " + recoveryPlacement.value + ".";
});


/* 
    Initial state 
*/

updateLabels();
updateUI();