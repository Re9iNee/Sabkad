const {
    ws_loadPlan,
    ws_createPlan,
    ws_updatePlan,
    ws_deletePlan,
} = require("../services/plan");

const {
    poolConnect,
    pool
} = require('../utils/charityDb');


exports.getPlans = async (req, res) => {
    let query = req.query;
    // T07 - Method 01
    // path: /plans/?PlanId=1&PlanName=Birthday&PlanNature=true&ParentPlanId=&Fdate=12-20-21&Tdate=12-20-21&neededLogin=false
    const result = await ws_loadPlan({
        pool,
        poolConnect
    }, {
        PlanName: query.PlanName,
        PlanNature: query.PlanNature,
        ParentPlanId: query.ParentPlanId,
        Fdate: query.Fdate,
        Tdate: query.Tdate,
        neededLogin: query.neededLogin,
        PlanId: query.PlanId
    });
    // Deconstrucing req.query object helps prevent typo in request url path. therefore keep our program less error prone.
    res.send({
        result
    })
}


exports.postPlans = async (req, res) => {
    // T07 - Method 02
    // Attach params to body as an JSON format - Postman Request: 
    // 
    const result = await ws_createPlan({
        pool,
        poolConnect
    }, req.body);
    // sending req.body directly causing program more error prone base on a typo, we will deconstruct object in that method.
    res.send({
        result
    })
}


exports.updatePlans = async (req, res) => {
    // T07 - Method 03
    // Attach filters object and newValues to request body
    // parameters sql connection, filters, newValues
    // returns plans table
    const result = await ws_updatePlan({
        pool,
        poolConnect
    }, req.body.filters, req.body.newValues);
    res.send({
        result
    });
};


exports.deletePlans = async (req, res) => {
    // T07 - Method 04
    // parameters: sql connection, planId
    const result = await ws_deletePlan({
        pool,
        poolConnect
    }, req.body.planId);
    res.send({
        result
    });
}