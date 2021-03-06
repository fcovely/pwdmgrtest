//
//  EthBLEClient.swift
//  AutoFillExtension
//
//  Created by Fred Covely on 9/6/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation
import UIKit
import CoreBluetooth
import KeychainAccess

//*******************************************************************
//BLE constant
//*******************************************************************
let ETH_advertising_serviceUUID = CBUUID(string:"19490016-5537-4F5E-99CA-290F4FBFF142")
let ETH_serviceUUID             = CBUUID(string:"19490001-5537-4F5E-99CA-290F4FBFF142")
let ETH_characteristicUUID      = CBUUID(string:"19490002-5537-4F5E-99CA-290F4FBFF142")



// STEP 0.1: this class adopts both the central and peripheral delegates
// and therefore must conform to these protocols' requirements
class EthBLEClient : NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
  
  // MARK: - Core Bluetooth class member variables
  
  // STEP 0.2: create instance variables of the
  // CBCentralManager and CBPeripheral so they
  // persist for the duration of the app's life
  var centralManager: CBCentralManager?
  var periphEthCard: CBPeripheral?
  var ethCharacteristic : CBCharacteristic?
  var cardDisconnectedCompletHandler: (() -> Void)?
  var _commandHandler:((UInt8,[UInt8]) -> Void)?
  var _writeCallback:(([UInt8]) -> Void)?
  var _peripheralConnectedHandler: ( () -> Void)?
  var registered_peripheral_name: String = ""
  var temp_buffer: [UInt8] = [UInt8]()
  var _aes_eax : Ether_AESEAX?

  var _registered_peripheral_id: String = ""
  var RegisteredPeripheralId :String
  {
   get {return _registered_peripheral_id}
   set(regPeriphid) { _registered_peripheral_id =  regPeriphid}
  }
  
  // MARK: - UI outlets / member variables
  var _cancel_request = false
  var CancelRequest :Bool
  {
    get {return _cancel_request}
    set(cancel) { _cancel_request =  cancel}
  }

  var _registered_serial_number = ""
  var RegisteredSerialNumber :String
  {
    get {return _registered_serial_number}
  }

  var _auto_reconnect = false;
  var AutoReconnect :Bool
  {
    get {return _auto_reconnect}
    set(auto_reconnect) { _auto_reconnect =  auto_reconnect}
  }
  
  var HasPeripheralConnection : Bool{
    get {
      if periphEthCard != nil
      {return true }
      else {return false}
    }
  }

  // MARK: - UIViewController delegate
  func initEthBLE( cardDisconnected: @escaping()->Void,  string_id: String, string_name: String, aex_eax : Ether_AESEAX,
                   commandHandler: @escaping (UInt8, [UInt8]) -> Void, peripheralConnectedHandler: @escaping () -> Void){
    _commandHandler = commandHandler
    _aes_eax = aex_eax
    temp_buffer.removeAll()
    _peripheralConnectedHandler = peripheralConnectedHandler
    cardDisconnectedCompletHandler = cardDisconnected
    // STEP 1: create a concurrent background queue for the central
    let centralQueue: DispatchQueue = DispatchQueue(label: "com.ethernom.centralMsgQueue", attributes: .concurrent)
    // STEP 2: create a central to scan for, connect to,
    // manage, and collect data from peripherals
    centralManager = CBCentralManager(delegate: self, queue: centralQueue)
    _registered_peripheral_id = string_id
    registered_peripheral_name = string_name

    //test();
  }
  func reinitEthBLE( 	cardDisconnected: @escaping()->Void,  string_id: String, string_name: String, aex_eax : Ether_AESEAX,
                       commandHandler: @escaping (UInt8,[UInt8]) -> Void, peripheralConnectedHandler: @escaping () -> Void){
    temp_buffer.removeAll();
    _aes_eax = aex_eax
    _commandHandler = commandHandler
    _peripheralConnectedHandler = peripheralConnectedHandler
    cardDisconnectedCompletHandler = cardDisconnected
    _registered_peripheral_id = string_id
    registered_peripheral_name = string_name
  }
  // MARK: - CBCentralManagerDelegate methods
  
  func doStartScan(){
    print("Bluetooth status is POWERED ON")
    // STEP 3.2: scan for peripherals that we're interested in
    print("starting manager for eth");
    self.centralManager?.scanForPeripherals(withServices: [ETH_advertising_serviceUUID])
    print("manager started");
  }
  
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    switch central.state {
    case .unknown:
      print("Bluetooth status is UNKNOWN")
    case .resetting:
      print("Bluetooth status is RESETTING")
    case .unsupported:
      print("Bluetooth status is UNSUPPORTED")
    case .unauthorized:
      print("Bluetooth status is UNAUTHORIZED")
    case .poweredOff:
      print("Bluetooth status is POWERED OFF")
    case .poweredOn:
      doStartScan()
    @unknown default:
      print("unknown power state in centralMangerDidUpdateState")
    }
  }
  
  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
    
    if advertisementData[CBAdvertisementDataManufacturerDataKey] == nil {
        return
    }
    
    if peripheral.name != nil{
      if ((advertisementData as NSDictionary).object(forKey: CBAdvertisementDataLocalNameKey)as? String) != nil{
        let uuid_string = peripheral.identifier.uuidString
        let dSerialNum = (advertisementData as NSDictionary).object(forKey: CBAdvertisementDataManufacturerDataKey) as? Data
        
        if(dSerialNum!.count < 8){
          return;
        }
        
        if (uuid_string == _registered_peripheral_id) {

          // device == registered_peripheral_name && uuid_string == registered_peripheral_id
          print("stop scan")
          StopScan()
          periphEthCard = peripheral;
          periphEthCard?.delegate = self;
          
          var temp = Data.init();
          var count = 0;
          for num in dSerialNum!.reversed(){
            if(count < 8){
              temp.append(num)
              count+=1;
            }else{
              break;
            }
          }
          _registered_serial_number = temp.hexEncodedString();
          centralManager?.connect(peripheral, options: nil)
        }
      }
    }
  }
  
  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    peripheral.discoverServices([ETH_serviceUUID])
  }
  
  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    print("Disconnected!")
    if(_auto_reconnect == false){
      DispatchQueue.main.async { () -> Void in}
      cardDisconnectedCompletHandler?()
    }else{
      _auto_reconnect = false;
      periphEthCard = peripheral;
      periphEthCard?.delegate = self;
      centralManager?.connect(peripheral, options: nil);
    }
  }
  
  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    for service in peripheral.services! {
      if service.uuid == ETH_serviceUUID {
        peripheral.discoverCharacteristics(nil, for: service)
      }
    }
  }
  
  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    for characteristic in service.characteristics! {
      if characteristic.uuid == ETH_characteristicUUID {
        ethCharacteristic = characteristic
        periphEthCard?.setNotifyValue(true, for: ethCharacteristic!)
        _peripheralConnectedHandler!();
      }
    }
  }
  
  func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    if characteristic.uuid == ETH_characteristicUUID {
      print("Characteristic updated")
      let buffer = [UInt8](characteristic.value!)
      print("inbound from card: ")
      print(buffer)
      print(buffer.hexaSpaced)
      if _writeCallback != nil{
        // the call itself may setup another write.. save off the var
         let  _tempWriteCallback = _writeCallback
        _writeCallback = nil
        _tempWriteCallback!(buffer)
      }
      else{
        handle_receives_packet(value: buffer);
      }
    }
  }
  func peripheral(_ peripheral: CBPeripheral, didWriteValueFor descriptor: CBDescriptor, error: Error?) {
    print("value written to card")
  }
  
  func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
    print("value written to card")
  }
  
  
  // Handle packet when receiving...
  func handle_receives_packet(value: [UInt8]){
    if(temp_buffer.count == 0){
      let len:Int32 = get_payload_length(LSB: value[4], MSB: value[5]);
      if(len == (value.count-8)){
        // check for encrypted packetcop
        // we need to get a transport header object here and use it rather than inspect raw bytes
        if (value[2] & UInt8(FLAG_CONTAIN_ENCRYPTION_HDR)) > 0{
          // decrypt
          // send in just the transport payload (encheader + app payload
          let (encHeader, transportPayload, appPayload) = ParseEncryptedHeader(payload: value)
          let DecryptedPacket = _aes_eax?.DecryptData(encHeader:Data(encHeader), encAppData: Data(appPayload))
          _commandHandler!(transportPayload[0],[UInt8](DecryptedPacket!))
        }
        else{
          _commandHandler!(0, value)
        }
        temp_buffer.removeAll();
      }else{
        print("Doesn't match, writing to temp buffer...");
        for byte in value{ temp_buffer.append(byte) }
      }
      
    }else{
      print("Concat to temp buffer first...");
      for byte in value{ temp_buffer.append(byte) }
      let initial_len:Int32 = get_payload_length(LSB: temp_buffer[4], MSB: temp_buffer[5]);
      if(initial_len == (temp_buffer.count-8)){
        if (value[2] & UInt8(FLAG_CONTAIN_ENCRYPTION_HDR)) > 0{
           // decrypt
           // send in just the transport payload (encheader + app payload
           let (encHeader, transportPayload, appPayload) = ParseEncryptedHeader(payload: value)
           let DecryptedPacket = _aes_eax?.DecryptData(encHeader:Data(encHeader), encAppData: Data(appPayload))
           _commandHandler!(transportPayload[0],[UInt8](DecryptedPacket!))
         }
        else{
          _commandHandler!(0, temp_buffer)
        }
        temp_buffer.removeAll();
      }
    }
  }
  
  func get_payload_length(LSB: UInt8, MSB: UInt8) -> Int32 {
    var len:Int32 = Int32(MSB) * 256 + Int32(LSB & 0xFF);
    if len < 0 { len = len & 0xFFFF; }
    return len
  }
  
  // MARK: - Utilities
  func decodePeripheralState(peripheralState: CBPeripheralState) {
    switch peripheralState {
    case .disconnected:
      print("Peripheral state: disconnected")
    case .connected:
      print("Peripheral state: connected")
    case .connecting:
      print("Peripheral state: connecting")
    case .disconnecting:
      print("Peripheral state: disconnecting")
    @unknown default:
     print("Peripheral state: unknown stateß")
    }
  }
  
  public func StopScan(){
    centralManager?.stopScan()
  }
 
  public func cancelRequest(){
    _cancel_request = false;
    if(periphEthCard != nil){
      centralManager?.cancelPeripheralConnection(periphEthCard!)
    }
    StopScan()
  }
  
  func computeChecksum(packet:[UInt8])->UInt8{
    var xorValue = packet[0];
     
     // xor the packet header for checksum
     var i = 0
     for c in packet {
       if i > 0 {
         xorValue = xorValue ^ c
       }
       i += 1
     }
    return xorValue
  }
  
  func MakeTransportHeader(srcport : UInt8, destprt : UInt8, control : UInt8, interface : UInt8, payloadLength : UInt16, protocol : UInt8)-> [UInt8]{
    var packet = [UInt8]()
    packet.append(srcport)
    packet.append(destprt)
    packet.append(control)
    packet.append(interface)
    let uInt8Value0 = UInt8(payloadLength & 0x00ff)
    let uInt8Value1 = UInt8(payloadLength >> 8)
    packet.append(uInt8Value0)
    packet.append(uInt8Value1)
   
    packet.append(INT8NULL)
    packet.append(computeChecksum(packet: packet));
    return packet
  }
  
   //hdr.writeUInt8((port == AO_PWD_MGR_ID) ? 0x81 : 0);
  //*******************************************************************
  //Password Manager transport protocol
  //*******************************************************************
  func getInitedPacket(payloadLength: UInt16, useEncryption: Bool) -> [UInt8]{
    let encPayloadLength = payloadLength + 16
    return MakeTransportHeader(srcport: PSD_MGR_PORT | 0x80, destprt: PSD_MGR_PORT, control: useEncryption ? 0x81 : 0, interface: TInterface.BLE.rawValue, payloadLength: encPayloadLength,protocol: INT8NULL)
  }
  
  //*******************************************************************
  //Generic transport protocol
  //*******************************************************************
  func getInitedPacket_Generic(payloadLength: UInt16) -> [UInt8]{
    return MakeTransportHeader(srcport: GENERIC_PORT | 0x80, destprt: GENERIC_PORT, control: 0, interface: TInterface.BLE.rawValue, payloadLength: payloadLength,protocol: INT8NULL)
  }
  
  func getInitedPackedRaw(payloadLength: UInt16) -> [UInt8]{
    return MakeTransportHeader(srcport: PSD_MGR_PORT | 0x80, destprt: PSD_MGR_PORT, control: 0, interface: TInterface.BLE.rawValue, payloadLength: payloadLength,protocol: INT8NULL)
  }

  func composeBLEPacket( data : [UInt8], encHeader : EtherEncHeader?) -> [UInt8]{
     let payload = getUInt8Payload(data: data)
     print("compose payload:")
     print(payload.hexaSpaced)
     var packetHeader = getInitedPacket(payloadLength: UInt16(payload.count), useEncryption: false)
     if encHeader != nil{
       encHeader?.SetPayloadLength(len: UInt16(payload.count))
       let epacket = encHeader?.GetHeaderBuffer()
       packetHeader += epacket!
     }
     packetHeader += payload;
     print("compose return:")
     print(packetHeader.hexaSpaced)
     return packetHeader;
    }

  func composeBLEPacket(cmd : UInt8,  data : [UInt8], encHeader : EtherEncHeader?) -> [UInt8]{
    var payload = [UInt8]()
    payload.append(cmd)
    payload.append(contentsOf: getUInt8Payload(data: data))
     print("compose payload:")
     print(payload.hexaSpaced)
     var packetHeader = getInitedPacket(payloadLength: UInt16(payload.count), useEncryption: false)
     if encHeader != nil{
       encHeader?.SetPayloadLength(len: UInt16(payload.count))
       let epacket = encHeader?.GetHeaderBuffer()
       packetHeader += epacket!
     }
     packetHeader += payload;
     print("compose return:")
     print(packetHeader.hexaSpaced)
     return packetHeader;
    }

  func composeBLEPacket(cmd : UInt8,  data : [String], encHeader : EtherEncHeader?) -> [UInt8]{
    // Construct payload as series of delimited strings
    var payload = [UInt8]()
    
    payload.append(cmd);
    if data.count == 0 {
      payload.append(UInt8(0));
    } else {
      var i = 0;
      for s in data{
        let array: [UInt8] = Array(s.utf8)
        for c in array{
          payload.append(c);
        }
        if i < data.count - 1 {
          payload.append(DELIMITER);
        }
        i += 1
      }
      payload.append(UInt8(0));
    }
    
    // stuff the payload length in the Enc header
    var packetHeader = getInitedPacket(payloadLength: UInt16(payload.count), useEncryption: (encHeader == nil) ? false : true)
    if encHeader != nil{
      encHeader?.SetPayloadLength(len: UInt16(payload.count))
      let epacket = encHeader?.GetHeaderBuffer()
      packetHeader += epacket!
    }
    packetHeader += payload;
    return packetHeader;
  }
  
  func getUInt8Payload( data : [UInt8])-> [UInt8]{
    var payload = [UInt8]()
    if data.count == 0 {
      payload.append(UInt8(0));
    } else {
      payload = payload + data
    }
    return payload
  }

  // for command data with just ints
  func composeBLEPacket(cmd : UInt8,  data : [UInt8]) -> [UInt8]{
    // Construct payload as series of delimited strings
    var payload = [UInt8]()
    payload.append(cmd)
    payload.append(contentsOf: getUInt8Payload(data: data))
    var packetHeader = getInitedPacket(payloadLength: UInt16(payload.count), useEncryption: false)
    packetHeader += payload;
    return packetHeader;
  }
  
  // fhc sspect
  func composeBLEPacketRaw(data : [UInt8]) -> [UInt8]{
    // Construct payload as series of delimited strings
    var payload = getUInt8Payload( data: data)
    var packetHeader =  getInitedPackedRaw(payloadLength: UInt16(payload.count))
    packetHeader += payload;
    return packetHeader;
  }
  
  func WriteDataToCard(cmd : UInt8,  data : [String]) {
    let packet = composeBLEPacket(cmd: cmd, data : data, encHeader: nil)
    let dp = Data(packet)
    periphEthCard?.writeValue(dp, for: ethCharacteristic!, type: .withResponse)
  }
  
  func WriteDataToCard(cmd : UInt8,  data : [UInt8]) {
    let packet = composeBLEPacket(cmd: cmd, data : data)
    let dp = Data(packet)
    periphEthCard?.writeValue(dp, for: ethCharacteristic!, type: .withResponse)
  }
  
  // for command data with just ints
  func composeBLEPacket_Generic(data : [UInt8]) -> [UInt8]{
    // Construct payload as series of delimited strings
    var payload = [UInt8]()
    if data.count == 0 {
      payload.append(UInt8(0));
    } else {
      payload = data
    }
    
    var packetHeader = getInitedPacket_Generic(payloadLength: UInt16(payload.count))
    packetHeader += payload;
    return packetHeader;
  }
  
  func composeBLEPacket_Generic(cmd : UInt8,  data : [String], encHeader : EtherEncHeader?) -> [UInt8]{
    // Construct payload as series of delimited strings
    var payload = [UInt8]()
    
    payload.append(cmd);
    if data.count == 0 {
      payload.append(UInt8(0));
    } else {
      var i = 0;
      for s in data{
        let array: [UInt8] = Array(s.utf8)
        for c in array{
          payload.append(c);
        }
        if i < data.count - 1 {
          payload.append(DELIMITER);
        }
        i += 1
      }
      payload.append(UInt8(0));
    }
    
    // stuff the payload length in the Enc header
    var packetHeader = getInitedPacket_Generic(payloadLength: UInt16(payload.count))
    if encHeader != nil{
      encHeader?.SetPayloadLength(len: UInt16(payload.count))
      let epacket = encHeader?.GetHeaderBuffer()
      packetHeader += epacket!
    }
    packetHeader += payload;
    return packetHeader;
  }
  
  func WriteDataToCard_Generic(data : [UInt8]) {
    let packet = composeBLEPacket_Generic(data : data)
    print("generic outbound")
    print(packet);
    let dp = Data(packet)
    periphEthCard?.writeValue(dp, for: ethCharacteristic!, type: .withResponse)
  }

  func WriteDataToCard_Generic(data : [UInt8], writeCallback: @escaping ([UInt8]) -> Void) {
    _writeCallback = writeCallback
    let packet = composeBLEPacket_Generic(data : data)
    print("generic outbound")
    print(packet);
    let dp = Data(packet)
    periphEthCard?.writeValue(dp, for: ethCharacteristic!, type: .withResponse)
  }

  // for DH back and forth
  func WriteDataToCard(data : [UInt8], writeCallback: @escaping ([UInt8]) -> Void) {
    _writeCallback = writeCallback
    let packet = composeBLEPacketRaw(data : data)
    print("dh outbound to card: ")
    print (packet);
    let dp = Data(packet)
    periphEthCard?.writeValue(dp, for: ethCharacteristic!, type: .withResponse)
  }

  
  func WriteDataToCard(cmd : UInt8,  data : [UInt8], encHeader: EtherEncHeader, writeCallback: @escaping ([UInt8]) -> Void) {
     _writeCallback = writeCallback
    let packet = composeBLEPacket(cmd: cmd, data : data, encHeader:encHeader)
    print("array of data outbound")
    print(packet);
    print (packet.hexaSpaced)

     let dp = Data(packet)
     periphEthCard?.writeValue(dp, for: ethCharacteristic!, type: .withResponse)
   }

  func WriteDataToCard(data : [UInt8], encHeader: EtherEncHeader, writeCallback: @escaping ([UInt8]) -> Void) {
     _writeCallback = writeCallback
    let packet = composeBLEPacket(data : data, encHeader:encHeader)
    print("array of data outbound")
    print(packet);
    print (packet.hexaSpaced)

     let dp = Data(packet)
     periphEthCard?.writeValue(dp, for: ethCharacteristic!, type: .withResponse)
   }
  

  func WriteDataToCard(cmd : UInt8,  data : [String], encHeader: EtherEncHeader, writeCallback: @escaping ([UInt8]) -> Void) {
    _writeCallback = writeCallback
    let packet = composeBLEPacket(cmd: cmd, data : data, encHeader: encHeader)
    print("array of string data outbound")
    print(packet);
    print (packet.hexaSpaced)
    let dp = Data(packet)
    periphEthCard?.writeValue(dp, for: ethCharacteristic!, type: .withResponse)
  }

  // fully encrypted
  func WriteDataToCardEncrypted(cmd : UInt8,  AppData : [UInt8]) {
    print("encrypted array of data outbound")
    var apppacket = [UInt8]()
    apppacket.append(cmd)
    apppacket.append(contentsOf: getUInt8Payload(data: AppData))
    // get the encrypted header prepended to the actual encrypted data
    let epacket = _aes_eax!.EncryptData(encPayload: Data(apppacket))
    
    var packetHeader = getInitedPacket(payloadLength: UInt16(apppacket.count), useEncryption: true)
    packetHeader += epacket!;
    print(packetHeader)
    print(packetHeader.hexaSpaced)
    let dp = Data(packetHeader)
    periphEthCard?.writeValue(dp, for: ethCharacteristic!, type: .withResponse)
   }

}
