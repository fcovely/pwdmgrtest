//
//  AppBase.swift
//  AutofillExtension
//
//  Created by Fred Covely on 1/15/20.
//  Copyright © 2020 Facebook. All rights reserved.
//

import Foundation


//*************************s******************************************
//Password Manager constant
//*******************************************************************
let EM_C2H:UInt8       = 0x80;
let EM_REPLY:UInt8     = 0x20;

//host to card cmd: REQUEST
//let H2C_RQST_INIT:UInt8                         = 0x01;
let H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY:UInt8 = 0x03;
let H2C_RQST_GET_ACCOUNT_PASS:UInt8             = 0x05;

//card to host cmd: REPLY
let C2H_RPLY_INIT:UInt8                         = (H2C_RQST_INIT|EM_C2H|EM_REPLY);
let C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY:UInt8 = (H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY|EM_C2H|EM_REPLY);
let C2H_RPLY_GET_ACCOUNT_PASS:UInt8             = (H2C_RQST_GET_ACCOUNT_PASS|EM_C2H|EM_REPLY);

//card to host cmd: REQUEST
let C2H_RQST_PIN_ENTRY:UInt8          = (0x03|EM_C2H);

//host to card cmd: REPLY
let H2C_RPLY_PIN_ENTRY:UInt8          = (C2H_RQST_PIN_ENTRY|EM_REPLY);

//response type
let AWK:UInt8   = 0x01;
let NAK:UInt8   = 0x00;
let OTHER:UInt8 = 0x02;

//*******************************************************************
//Generic constant
//*******************************************************************
/*
//host to card
let CM_LAUNCH_APP:UInt8       = 0x81;
let CM_SUSPEND_APP:UInt8      = 0x82;
let CM_INIT_APP_PERM:UInt8    = 0x87;

let CM_INIT_DM:UInt8    = 0x89;
let CM_PIN_RSP:UInt8    = 0x8A;
let CM_SESSION_REQUEST:UInt8    = 0x8B;
let CM_SESSION_RECONNECT:UInt8    = 0x8C;
let CM_SESSION_TERMINATE:UInt8    = 0x8D;

//card to host
let CM_RSP:UInt8          = 0x01;
let CM_AUTHENTICATE:UInt8 = 0x08;

let CM_SESSION_RSP:UInt8   = 0x0B;

//response type
let CM_ERR_SUCCESS:UInt8         = 0x00;
let CM_ERR_CARD_BUSY:UInt8       = 0x01;
let CM_ERR_INVALID_CMD:UInt8     = 0x02;
let CM_ERR_APP_NOT_ALLOWED:UInt8 = 0x04;
let CM_ERR_INVALID_IMG_ID:UInt8  = 0x08;
let CM_ERR_APP_BUSY:UInt8        = 0x09;

 let CARD_NAME_MAX_LEN = 15 - 4;
 let HOST_NAME_MAX_LEN = 15;
*/
 
