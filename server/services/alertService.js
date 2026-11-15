import Alert from '../models/Alert.js';

/**
 * Creates an alert if a state transition occurs or a critical threshold is breached.
 * Avoids generating duplicate alerts for steady states.
 */
export async function handleStateAlert(server, fsmResult, io) {
  if (!fsmResult.transitioned) {
    return null;
  }

  const { previousState, newState, reason } = fsmResult;
  let title = '';
  let severity = 'INFO';
  let message = reason;

  if (newState === 'DISCONNECTED') {
    title = `Server Disconnected: ${server.name}`;
    severity = 'CRITICAL';
    message = `Critical outage detected on ${server.name} (${server.url}). ${reason}`;
  } else if (newState === 'SLOW' && previousState === 'ACTIVE') {
    title = `High Latency Alert: ${server.name}`;
    severity = 'WARNING';
    message = `Performance degradation on ${server.name}. Response time exceeded threshold of ${server.responseThreshold}ms.`;
  } else if (newState === 'RECOVERING') {
    title = `Recovery Initiated: ${server.name}`;
    severity = 'INFO';
    message = `First successful health-check signal received from ${server.name}. Recovery verification is underway.`;
  } else if (newState === 'ACTIVE' && (previousState === 'RECOVERING' || previousState === 'SLOW' || previousState === 'DISCONNECTED')) {
    title = `Server Recovered: ${server.name}`;
    severity = 'SUCCESS';
    message = `Server ${server.name} has recovered and is now fully operational in ACTIVE state.`;
  } else {
    title = `State Transition: ${server.name}`;
    severity = 'INFO';
    message = `Server transitioned from ${previousState} to ${newState}. Reason: ${reason}`;
  }

  try {
    const alert = await Alert.create({
      serverId: server._id,
      serverName: server.name,
      title,
      severity,
      message,
      isRead: false,
      createdAt: new Date(),
    });

    if (io) {
      io.emit('new_alert', alert);
    }

    return alert;
  } catch (err) {
    console.error(`[AlertService] Failed to create alert for server ${server.name}:`, err.message);
    return null;
  }
}
