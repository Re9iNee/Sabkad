import { combineReducers } from "redux";
import {cmnBaseTypeReducer} from './cmnBaseTypeReducer';
import {cmnBaseDataReducer} from './cmnBaseDataReducer';
import {charityAccReducer} from './charityAccReducer';
import {plansReducer} from './plans';
import {personalReducer} from './personal';

export const reducers = combineReducers( {
    baseType : cmnBaseTypeReducer ,
    baseData : cmnBaseDataReducer ,
    charityAccount :  charityAccReducer ,
    plans : plansReducer ,
    persons : personalReducer
} )