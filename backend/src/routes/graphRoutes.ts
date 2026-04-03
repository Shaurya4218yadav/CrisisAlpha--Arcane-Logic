// ============================================================
// CrisisAlpha — Graph Routes
// REST API for world graph data
// ============================================================

import { Router, Request, Response } from 'express';
import {
  loadGraph, serializeNodes, serializeEdges, serializeChokepoints,
  serializePoliticalRelations, findPathsBetween, getPoliticalRelation,
} from '../services/graphService';

const router = Router();

// GET /api/graph/nodes — all trade hub nodes
router.get('/nodes', (req: Request, res: Response) => {
  const graph = loadGraph();
  res.json({
    count: graph.nodes.size,
    nodes: serializeNodes(graph),
  });
});

// GET /api/graph/edges — all trade route edges
router.get('/edges', (req: Request, res: Response) => {
  const graph = loadGraph();
  res.json({
    count: graph.edges.size,
    edges: serializeEdges(graph),
  });
});

// GET /api/graph/node/:id — single node details
router.get('/node/:id', (req: Request, res: Response) => {
  const graph = loadGraph();
  const node = graph.nodes.get(req.params.id);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  res.json(node);
});

// GET /api/graph/full — full graph (nodes + edges + chokepoints)
router.get('/full', (req: Request, res: Response) => {
  const graph = loadGraph();
  res.json({
    nodes: serializeNodes(graph),
    edges: serializeEdges(graph),
    chokepoints: serializeChokepoints(graph),
    relations: serializePoliticalRelations(graph),
    stats: {
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.size,
      chokepointCount: graph.chokepoints.size,
      regionCount: graph.regions.size,
      relationCount: graph.politicalRelations.length,
    },
  });
});

// GET /api/graph/countries — all countries
router.get('/countries', (req: Request, res: Response) => {
  const graph = loadGraph();
  res.json({
    count: graph.countries.size,
    countries: Array.from(graph.countries.values()),
  });
});

// GET /api/graph/chokepoints — all chokepoints
router.get('/chokepoints', (req: Request, res: Response) => {
  const graph = loadGraph();
  res.json({
    count: graph.chokepoints.size,
    chokepoints: serializeChokepoints(graph),
  });
});

// GET /api/graph/regions — all regions
router.get('/regions', (req: Request, res: Response) => {
  const graph = loadGraph();
  res.json({
    count: graph.regions.size,
    regions: Array.from(graph.regions.values()),
  });
});

// GET /api/graph/relations — all political relations
router.get('/relations', (req: Request, res: Response) => {
  const graph = loadGraph();
  res.json({
    count: graph.politicalRelations.length,
    relations: serializePoliticalRelations(graph),
  });
});

// GET /api/graph/relations/:a/:b — specific political relation
router.get('/relations/:a/:b', (req: Request, res: Response) => {
  const graph = loadGraph();
  const relation = getPoliticalRelation(graph, req.params.a.toUpperCase(), req.params.b.toUpperCase());
  if (!relation) {
    return res.status(404).json({ error: 'No relation found' });
  }
  res.json(relation);
});

// GET /api/graph/path/:from/:to — shortest paths between nodes
router.get('/path/:from/:to', (req: Request, res: Response) => {
  const graph = loadGraph();
  const maxDepth = parseInt(req.query.maxDepth as string) || 5;
  const paths = findPathsBetween(graph, req.params.from, req.params.to, maxDepth);
  res.json({
    from: req.params.from,
    to: req.params.to,
    pathCount: paths.length,
    paths: paths.slice(0, 10), // limit to 10 paths
  });
});

export default router;
