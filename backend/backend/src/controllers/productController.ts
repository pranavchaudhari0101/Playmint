import { Request, Response } from 'express';
import { query } from '../utils/db';

export class ProductController {
  static async list(req: Request, res: Response) {
    try {
      const { category } = req.query;

      if (category) {
        const res = await query(
          `SELECT p.*, c.name as category_name
           FROM products p
           JOIN categories c ON p.category_id = c.id
           WHERE c.slug = $1 AND p.is_active = true`,
          [category]
        );
        return res.json(res.rows);
      }

      const res = await query(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = true`,
        []
      );
      res.json(res.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const res = await query(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.id = $1 AND p.is_active = true`,
        [id]
      );

      if (res.rowCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(res.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
