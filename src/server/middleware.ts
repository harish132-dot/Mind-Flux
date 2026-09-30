import type { IncomingMessage, ServerResponse } from 'http';
import { processChat, processDatasetStats } from './api';
import { predictStudentPerformance, getOrTrainModel, retrainModel } from '../ml/inference';
import { calculateStudentMetrics, generateRuleBasedRecommendations } from '../ml/studentAnalytics';

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function handleApiRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/')) {
    return false;
  }

  try {
    if (url === '/api/chat' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await processChat(body);
      sendJson(res, 200, result);
      return true;
    }

    if (url === '/api/predict' && req.method === 'POST') {
      const body = await parseBody(req);
      const prediction = predictStudentPerformance(body);
      sendJson(res, 200, prediction);
      return true;
    }

    if (url === '/api/analyze' && req.method === 'POST') {
      const body = await parseBody(req);
      const metrics = calculateStudentMetrics(body);
      const recommendations = generateRuleBasedRecommendations(body, metrics);
      sendJson(res, 200, { metrics, recommendations });
      return true;
    }

    if (url === '/api/ml-model' && req.method === 'GET') {
      const model = getOrTrainModel();
      // Return evaluation metrics and metadata without sensitive raw weights
      sendJson(res, 200, {
        version: model.version,
        architecture: model.architecture,
        trainedAt: model.trainedAt,
        evaluation: model.evaluation,
        featureImportances: model.featureImportances,
        classes: model.classes,
      });
      return true;
    }

    if (url === '/api/ml-model/retrain' && req.method === 'POST') {
      const model = retrainModel();
      sendJson(res, 200, {
        success: true,
        version: model.version,
        evaluation: model.evaluation,
      });
      return true;
    }

    if (url === '/api/files/analyze' && req.method === 'POST') {
      const body = await parseBody(req);
      const stats = processDatasetStats(body.rows || []);
      sendJson(res, 200, stats);
      return true;
    }

    sendJson(res, 404, { error: 'API endpoint not found' });
    return true;
  } catch (err: any) {
    console.error('API Error:', err);
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
    return true;
  }
}
