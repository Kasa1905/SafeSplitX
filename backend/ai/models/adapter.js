/**
 * Database Agnostic Adapter for AI Models
 * Provides unified interface for both MongoDB (Mongoose) and PostgreSQL (Sequelize)
 */

const logger = require('../../utils/logger');

/**
 * Check if a model is a Mongoose model
 * @param {Object} model - The model to check
 * @returns {boolean} - True if Mongoose model, false otherwise
 */
function isMongooseModel(model) {
  return model && 
         typeof model.find === 'function' && 
         typeof model.countDocuments === 'function' &&
         typeof model.aggregate === 'function';
}

/**
 * Check if a model is a Sequelize model
 * @param {Object} model - The model to check
 * @returns {boolean} - True if Sequelize model, false otherwise
 */
function isSequelizeModel(model) {
  return model && 
         typeof model.findAll === 'function' && 
         typeof model.count === 'function' &&
         model.sequelize !== undefined;
}

/**
 * Generic find operation
 * @param {Object} model - The model to query
 * @param {Object} criteria - Query criteria
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Query results
 */
async function find(model, criteria = {}, options = {}) {
  if (!model) {
    throw new Error('Model is required for find operation');
  }

  try {
    if (isMongooseModel(model)) {
      // Mongoose implementation
      let query = model.find(criteria);
      
      if (options.limit) query = query.limit(options.limit);
      if (options.skip) query = query.skip(options.skip);
      if (options.sort) query = query.sort(options.sort);
      if (options.select) query = query.select(options.select);
      
      return await query.exec();
    } else if (isSequelizeModel(model)) {
      // Sequelize implementation
      const sequelizeOptions = {
        where: criteria,
        ...(options.limit && { limit: options.limit }),
        ...(options.skip && { offset: options.skip }),
        ...(options.sort && { order: convertSortToSequelize(options.sort) }),
        ...(options.select && { attributes: options.select })
      };
      
      return await model.findAll(sequelizeOptions);
    } else {
      throw new Error('Unsupported model type. Expected Mongoose or Sequelize model.');
    }
  } catch (error) {
    logger.error('Database find operation failed:', {
      error: error.message,
      modelName: model.modelName || model.name,
      criteria,
      options
    });
    throw error;
  }
}

/**
 * Generic count operation
 * @param {Object} model - The model to query
 * @param {Object} criteria - Query criteria
 * @returns {Promise<number>} - Count result
 */
async function count(model, criteria = {}) {
  if (!model) {
    throw new Error('Model is required for count operation');
  }

  try {
    if (isMongooseModel(model)) {
      // Mongoose implementation
      return await model.countDocuments(criteria);
    } else if (isSequelizeModel(model)) {
      // Sequelize implementation
      return await model.count({ where: criteria });
    } else {
      throw new Error('Unsupported model type. Expected Mongoose or Sequelize model.');
    }
  } catch (error) {
    logger.error('Database count operation failed:', {
      error: error.message,
      modelName: model.modelName || model.name,
      criteria
    });
    throw error;
  }
}

/**
 * Generic aggregation/grouping operation
 * @param {Object} model - The model to query
 * @param {Array|Object} pipelineOrOptions - MongoDB pipeline or Sequelize options
 * @returns {Promise<Array>} - Aggregation results
 */
async function aggregateOrGroup(model, pipelineOrOptions = []) {
  if (!model) {
    throw new Error('Model is required for aggregation operation');
  }

  try {
    if (isMongooseModel(model)) {
      // Mongoose implementation - use MongoDB aggregation pipeline
      return await model.aggregate(pipelineOrOptions);
    } else if (isSequelizeModel(model)) {
      // Sequelize implementation - convert to findAll with grouping
      // This is a simplified conversion - complex aggregations may need custom handling
      const options = Array.isArray(pipelineOrOptions) 
        ? convertPipelineToSequelize(pipelineOrOptions)
        : pipelineOrOptions;
        
      return await model.findAll(options);
    } else {
      throw new Error('Unsupported model type. Expected Mongoose or Sequelize model.');
    }
  } catch (error) {
    logger.error('Database aggregation operation failed:', {
      error: error.message,
      modelName: model.modelName || model.name,
      pipelineOrOptions
    });
    throw error;
  }
}

/**
 * Convert MongoDB sort object to Sequelize order array
 * @param {Object} sort - MongoDB sort object
 * @returns {Array} - Sequelize order array
 */
function convertSortToSequelize(sort) {
  if (typeof sort === 'string') {
    return sort.startsWith('-') 
      ? [[sort.substring(1), 'DESC']]
      : [[sort, 'ASC']];
  }
  
  return Object.entries(sort).map(([field, direction]) => [
    field,
    direction === -1 || direction === 'desc' ? 'DESC' : 'ASC'
  ]);
}

/**
 * Convert MongoDB aggregation pipeline to Sequelize options
 * This is a simplified conversion for basic operations
 * @param {Array} pipeline - MongoDB aggregation pipeline
 * @returns {Object} - Sequelize query options
 */
function convertPipelineToSequelize(pipeline) {
  const options = {};
  
  for (const stage of pipeline) {
    const stageName = Object.keys(stage)[0];
    const stageValue = stage[stageName];
    
    switch (stageName) {
      case '$match':
        options.where = { ...options.where, ...stageValue };
        break;
      case '$sort':
        options.order = convertSortToSequelize(stageValue);
        break;
      case '$limit':
        options.limit = stageValue;
        break;
      case '$skip':
        options.offset = stageValue;
        break;
      case '$group':
        // Basic grouping support - complex aggregations need custom handling
        if (stageValue._id) {
          options.group = Array.isArray(stageValue._id) 
            ? stageValue._id 
            : [stageValue._id];
        }
        // TODO: Handle complex aggregation functions
        logger.warn('Complex aggregation detected - may need custom handling', { stage });
        break;
      default:
        logger.warn(`Unsupported aggregation stage: ${stageName}`, { stage });
        // TODO: Add support for more aggregation stages
        break;
    }
  }
  
  return options;
}

/**
 * Execute raw SQL query for complex operations (Sequelize only)
 * @param {Object} sequelize - Sequelize instance
 * @param {string} query - Raw SQL query
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Query results
 */
async function executeRawQuery(sequelize, query, options = {}) {
  if (!sequelize || typeof sequelize.query !== 'function') {
    throw new Error('Valid Sequelize instance required for raw query');
  }

  try {
    const [results] = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      ...options
    });
    return results;
  } catch (error) {
    logger.error('Raw query execution failed:', {
      error: error.message,
      query,
      options
    });
    throw error;
  }
}

/**
 * Get database type from model
 * @param {Object} model - The model to check
 * @returns {string} - Database type ('mongodb', 'postgresql', 'unknown')
 */
function getDatabaseType(model) {
  if (isMongooseModel(model)) return 'mongodb';
  if (isSequelizeModel(model)) return 'postgresql';
  return 'unknown';
}

module.exports = {
  isMongooseModel,
  isSequelizeModel,
  find,
  count,
  aggregateOrGroup,
  executeRawQuery,
  getDatabaseType,
  convertSortToSequelize,
  convertPipelineToSequelize
};