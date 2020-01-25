//
//  CredProviderViewController.swift
//  AutoFillExtension
//
//  Created by Ethernom on 8/21/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import AuthenticationServices
import KeychainAccess
import UIKit
import DomainParser

struct EtherCred{
  var username:String
  var server:String
  var password:String
}

class etherCustomCellView : UITableViewCell{
  
  override func awakeFromNib() {
    super.awakeFromNib()
  }
  
  override func setSelected(_ selected: Bool, animated: Bool) {
    super.setSelected(selected, animated: animated)
  }
}

public var _inBackground:Bool = false
public var _terminatedByOS = false;

class CredProviderViewController: ASCredentialProviderViewController, UITableViewDelegate, UITableViewDataSource, UISearchBarDelegate{
  var Creds : [EtherCred] = []
  var filtered_Creds: [EtherCred] = []
  var domain_name:String!;
  
  static var client:PwdManager!;
  //  static var timer_hander: Timer!;
  
  var host_id = String();
  var host_name = String();
  
  let searchController = UISearchController(searchResultsController: nil)
  
  @IBOutlet weak var credTable: UITableView!
  @IBOutlet weak var status_label: UILabel!
  @IBOutlet weak var search_bar: UISearchBar!
  @IBOutlet weak var navigationBar:UINavigationBar!
  @IBOutlet weak var pinView:UIView!
  @IBOutlet weak var desLabel:UILabel!
  @IBOutlet weak var authLabel:UILabel!
  @IBOutlet weak var wrongPin:UILabel!
  @IBOutlet weak var submitBtn:UIButton!
  @IBOutlet weak var pinCodeTextField: PinCodeTextField!
  @IBOutlet weak var connectView:UIView!
  @IBOutlet weak var connectingImg:UIImageView!
  @IBOutlet weak var line:UIView!
  
  var pinCode = [String]()
  var isSubmitPIN = false
  var isFilled = false
  var _pin_length:Int = 0;
  
  var domainParser: DomainParser!
  var keychain = Keychain(service: "com.ethernom.password.manager.mobile.data.registered_peripheral", accessGroup: "group.com.ethernom.password.manager.mobile");
  
  var activityIndicator: UIActivityIndicatorView = UIActivityIndicatorView()
  var boxView: UIView = UIView()
  var textLabel: UILabel = UILabel()
  var viewOverlay = UIView()
  
  override func viewDidLoad() {
    super.viewDidLoad()
    
    _inBackground = false;
    //try? keychainForTempData.remove("data")
    isFilled = false;
    
    setupTableView()
    domainParser = try! DomainParser()
    search_bar.delegate = self
    view.backgroundColor = .white
    navigationItem.searchController = searchController
    definesPresentationContext = true
    searchController.searchBar.delegate = self
    searchController.searchBar.backgroundColor = .white
    
    navigationBar.isTranslucent = false
    navigationBar.setBackgroundImage(UIImage(), for: .default)
    navigationBar.shadowImage = UIImage()
    status_label.font = UIFont.systemFont(ofSize: 16, weight: .thin)
    
    if CredProviderViewController.client == nil{
      setupInputPin()
    }
    
    //let tap: UITapGestureRecognizer = UITapGestureRecognizer(target: self, action: #selector(handleDismissKeyboard))
    //view.addGestureRecognizer(tap)
    
    addLoadingRetrievingData()
  }
  
  func addLoadingRetrievingData() {
    viewOverlay = UIView(frame: CGRect(x: 0, y: 0, width: view.frame.width, height: view.frame.height))
    viewOverlay.backgroundColor = UIColor.black.withAlphaComponent(0.5)
    viewOverlay.isHidden = true
    
    boxView = UIView(frame: CGRect(x: view.frame.midX - 120, y: view.frame.midY - 80, width: 250, height: 100))
    boxView.layer.cornerRadius = 10
    boxView.isHidden = true
    
    activityIndicator = UIActivityIndicatorView(style: UIActivityIndicatorView.Style.white)
    activityIndicator.frame = CGRect(x: 75, y: 0, width: 80, height: 80)
  
    textLabel = UILabel(frame: CGRect(x: 20, y: 50, width: 250, height: 50))
    textLabel.textColor = UIColor.white
    textLabel.font = UIFont.systemFont(ofSize: 20, weight: .thin)
    textLabel.text = "Loading: Retrieving data..."
    textLabel.isHidden = true
    
    boxView.addSubview(activityIndicator)
    boxView.addSubview(textLabel)
    view.addSubview(viewOverlay)
    viewOverlay.addSubview(boxView)
    
  }
  
  func startAnimate() {
    activityIndicator.startAnimating()
    textLabel.isHidden = false
    boxView.isHidden = false
    viewOverlay.isHidden = false
  }
  func stopAnimate(){
    activityIndicator.stopAnimating()
    textLabel.isHidden = true
    boxView.isHidden = true
    viewOverlay.isHidden = true
  }
  @objc func handleDismissKeyboard(){
    view.endEditing(true)
    //pinCodeTextField.resignFirstResponder()
  }
  
  fileprivate func setupInputPin() {
    pinView.isHidden = true
    wrongPin.isHidden = true
    
    submitBtn.isEnabled = false
    submitBtn.backgroundColor = UtilConstant.hexStringToUIColor(hex: "#9E9E9E")
    submitBtn.layer.cornerRadius = 5
    submitBtn.titleLabel?.font = UIFont.systemFont(ofSize: 20)
    submitBtn.layer.borderColor = UIColor.lightGray.cgColor
    submitBtn.addTarget(self, action: #selector(handleSubmitPin), for: .touchUpInside)
    
    let pin_len_keychain = Keychain(service: "com.ethernom.password.manager.mobile.pin.length", accessGroup: "group.com.ethernom.password.manager.mobile")
    let pin_length_string = try? pin_len_keychain.getString("data");
    _pin_length = Int(pin_length_string!)!;
    print(_pin_length);
    
    pinCodeTextField.delegate = self
    pinCodeTextField.characterLimit = _pin_length;
    pinCodeTextField.text = "";
    pinCodeTextField.keyboardType = .numberPad;
    pinCodeTextField.backgroundColor = UtilConstant.hexStringToUIColor(hex: "#424242")
    pinCodeTextField.layer.cornerRadius = 10;
    
    desLabel.text = "Please enter the " + pin_length_string! + " digit PIN code that appear on your device screen.";
  }
  
  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    print("viewDidDisappear")
    if(isFilled == false){
      disconnectFromCard()
    }else{
      NSLog("FHCFRED got viewDidDisappear background mode firing!")
      doBackgroundMode();
    }
  }
  
  func doBackgroundMode(){
    _inBackground = true
    _terminatedByOS = false
    ProcessInfo.processInfo.performExpiringActivity(withReason: "BLE") {
      expired in
      if !expired {
        // still alive, keep BLE active
        NSLog("ETHDBG performExpiring not expiring")
        var prematureExpiry = false
        for _ in 1...30 {
          if _inBackground == false || _terminatedByOS == true{
            NSLog("ETHDBG in expiring terminating loop");
            prematureExpiry = true // we were restarted
            break;
          }
          Thread.sleep(forTimeInterval: 1)
        }
        NSLog("ETHDBG Background task ending normally");
        if !prematureExpiry{
          //we went the full 30 seconds
          _terminatedByOS = true
// refactor          CredProviderViewController.client.requestSuspendApp()
          CredProviderViewController.client = nil
        }
        //self.endActivity
      } else {
        // taken out by OS
        NSLog("ETHDBG terminating background task and client via OS")
        _terminatedByOS = true
// refactor        CredProviderViewController.client.requestSuspendApp()
        CredProviderViewController.client = nil
      }
    }
  }
  
  
  override public var prefersStatusBarHidden: Bool {
    return false
  }
  
  override public var preferredStatusBarStyle: UIStatusBarStyle {
    return UIStatusBarStyle.lightContent
  }
  
  fileprivate func setupTableView() {
    credTable.delegate = self;
    credTable.dataSource = self;
    self.credTable.allowsSelectionDuringEditing = false
    self.credTable.allowsSelection = true
    self.credTable.separatorInset = .zero
  }
  
  override func prepareCredentialList(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
    for identifiers in serviceIdentifiers{
      let type_enum = identifiers.type
      if(type_enum.rawValue == 0){
        search_bar.text = identifiers.identifier.lowercased()
        domain_name = identifiers.identifier.lowercased()
      }else if(type_enum.rawValue == 1){
        let url = URL(string:identifiers.identifier)!
        let domain = domainParser.parse(host: url.host!)?.domain
        search_bar.text = domain!.lowercased()
        domain_name = domain!.lowercased()
      }
    }
    
    /*if(useKCStoredPwd){
     self.credTable.reloadData()  // display the cached credential
     }else{
     */
    let value = try? keychain.getString("data")
    if(value != nil){
      let string_value = value!
      let json_data = string_value.toJSON() as? [String:AnyObject]
      let id = json_data!["id"] as! String
      let name = json_data!["name"] as! String
      
      if CredProviderViewController.client == nil{
        CredProviderViewController.client = PwdManager()
        CredProviderViewController.client.initPwdManager(string_id: id, string_name: name,
            cardConnectionEstablished : cardConnectionEstablished,
            secureCardConnectionEstablished: secureCardConnectionEstablished,
            secureAppSessionEstablished: secureAppSessionEstablished,
            accountFetched: accountFetched,
            operationComplete: cardOperationComplete,
            cardRequestEntryPin: cardRequestEntryPinCompleteHandler,
            cardDisconnected: cardDisconnectedHandler,
            accountFetchedWithPassword: accountFetchedWithPassword);
      }
      else{
     //   appSecurelyConnected(0)
        CredProviderViewController.client.initPwdManager(string_id: id, string_name: name,
             cardConnectionEstablished : cardConnectionEstablished,
             secureCardConnectionEstablished: secureCardConnectionEstablished,
             secureAppSessionEstablished: secureAppSessionEstablished,
             accountFetched: accountFetched,
             operationComplete: cardOperationComplete,
             cardRequestEntryPin: cardRequestEntryPinCompleteHandler,
             cardDisconnected: cardDisconnectedHandler,
             accountFetchedWithPassword: accountFetchedWithPassword);
      }
      status_label.text = "Connecting to device...\nName: " + name + "\n";
      connectingImg.image = UIImage(named: "connecting")
      search_bar.isHidden = true
    }
    else{
      status_label.text = "There appears to be no registered devices with Ethernom Password Manager. Please register your device using the main application Ethernom Password Manager!";
      search_bar.isHidden = true
      
    }
    //}
  }
  
  public func tableView(_ tableView: UITableView, didHighlightRowAt indexPath: IndexPath) {
    let cred = filtered_Creds[indexPath.row]
    print("cred\(cred)")
    CredProviderViewController.client.StartAccountRetrieval(server: cred.server, username: cred.username)
  }
  
  
  public func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return filtered_Creds.count
  }
  
  //--------------------------------------------------   
  //-------------- Attention to IG TEAM --------------
  //--------------------------------------------------
  
  //WHEN USER SUBMIT PIN
  @objc func handleSubmitPin() {
    CredProviderViewController.client.DoSubmitPin(pinCode : pinCode)
    isSubmitPIN = true
  }
  
  @objc func cardDisconnectedHandler(result : EtherErrorValue) {
    disconnectFromCard()
  }
  
  public func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "etherTableCell", for: indexPath)
    let txt = filtered_Creds[indexPath.row].server + " \n" + filtered_Creds[indexPath.row].username
    
    cell.textLabel?.text = txt
    cell.accessoryType = .disclosureIndicator
    cell.textLabel?.numberOfLines = 2
    cell.selectionStyle = .none
    return cell
  }
 
  @objc func cardConnectionEstablished( result: EtherErrorValue){
      if result == EtherError.ETH_SUCCESS{
        print("Found card, attempt connection...")
        
        DispatchQueue.main.async {
          self.connectView.isHidden = false
          self.connectingImg.isHidden = true
          self.status_label.isHidden = true
          self.pinView.isHidden = true
        }
        
        let value = try? keychain.getString("data")
        if(value != nil){
          let string_value = value!
          let json_data = string_value.toJSON() as? [String:AnyObject]
          let id = json_data!["id"] as! String
          let name = json_data!["name"] as! String
          
          DispatchQueue.main.async {
            self.status_label.text = "Retrieving Data ...\nName: " + name + "\nID: " + id + "\n";
            self.search_bar.isHidden = false
            self.search_bar.isHidden = false
            self.startAnimate()
          }
        }
        CredProviderViewController.client.DoStartCardAuthentication()
    }
	}
	
    // we have connected to the card securely but need to connect to the app itself
  @objc func secureCardConnectionEstablished(result : EtherErrorValue) {
    if result == EtherError.ETH_SUCCESS{
      
      filtered_Creds.removeAll();
      let device_name = UIDevice.current.name
      let device_id = UIDevice.current.identifierForVendor!.uuidString
      
      let new_device_name = device_name.replacingOccurrences(of: "’", with: "'")
      let new_device_id = device_id.replacingOccurrences(of: "’", with: "'")
      
      if new_device_name.count > 15 {
        host_name = new_device_name.subString(from:0,to:14);
      }else{
        host_name = new_device_name;
      }
      
      let confirmation_code = randomString(length: 6);
      if new_device_id.count > 31 {
        host_id = new_device_id.subString(from:0, to:29)
      }
      
      if(CredProviderViewController.client != nil){
        CredProviderViewController.client.requestAppLaunch(host_name: host_name);
      }
    }
  }

  @objc func secureAppSessionEstablished(result : EtherErrorValue) {
    if result == EtherError.ETH_SUCCESS{
      CredProviderViewController.client.RetrieveAccounts()
    }
  }

  @objc func cardRequestEntryPinCompleteHandler(){
    print("CARD REQUEST ENTRY PIN")
    if isSubmitPIN == true {
      self.wrongPin.isHidden = false
      self.submitBtn.isEnabled = false
      self.pinCodeTextField.text = ""
      self.submitBtn.backgroundColor = UtilConstant.hexStringToUIColor(hex: "#9E9E9E")
    }
    
    isSubmitPIN = true;
    
    DispatchQueue.main.async {
      let value = try? self.keychain.getString("data")
      if(value != nil){
        let string_value = value!
        let json_data = string_value.toJSON() as? [String:AnyObject]
        let id = json_data!["id"] as! String
        let name = json_data!["name"] as! String
        
        DispatchQueue.main.async {
          self.status_label.text = "Connected to device...\nName: " + name + "\nID: " + id + "\n";
        }
      }
      
      self.pinView.isHidden = false
      self.connectView.isHidden = true
      self.submitBtn.isHidden = true
      if (self.pinCodeTextField.delegate?.textFieldShouldBeginEditing(self.pinCodeTextField) ?? true) {
        let _ = self.pinCodeTextField.becomeFirstResponder()
      }
    }
  }
  
  @objc func cardOperationComplete() {
    DispatchQueue.main.async {
      self.pinView.isHidden = true
      self.connectView.isHidden = true
      
      if(self.Creds.count > 0){
        self.status_label.isHidden = true
        self.credTable.frame.origin.y -= 58
        
        self.stopAnimate()
        
        var temp_filtered_Creds: [EtherCred] = []
        for creds in self.Creds{
          if(creds.server.lowercased().contains(self.domain_name.lowercased()) || creds.username.lowercased().contains(self.domain_name.lowercased())){
            temp_filtered_Creds.append(creds)
          }
        }
        self.filtered_Creds = temp_filtered_Creds
      }else{
        self.status_label.text = "There appears to be no account in your device";
      }
      
      self.credTable.reloadData()
    };
  }
  
  @objc func accountFetched(accountData : [String]) {
    print("Account data fetched")
    let server = accountData[0]
    let username = accountData[1]
    let password = ""
    // let key = accountData[2]
    let v = EtherCred(username: username, server: server, password: password)
    Creds.append(v)
  }
  
  @objc func accountFetchedWithPassword(accountData : [String]) {
    isFilled = true;
    print("Account data fetched with password")
    print(accountData[1])
    
    /*
     Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { (t) in
     print("FHCFRED Timer fired closing card")
     CredProviderViewController.client.cancelRequest()
     CredProviderViewController.client = nil
     //self.endActivity
     }
     */
    
    let passwordCredential = ASPasswordCredential(user: accountData[1], password: accountData[2])
    self.extensionContext.completeRequest(withSelectedCredential: passwordCredential, completionHandler: nil)
  }
  
  @IBAction func cancel(_ sender: AnyObject?) {
    isFilled = false;
    
    if(CredProviderViewController.client != nil){
      //client.cancelRequest()
      //refactor //CredProviderViewController.client.requestSuspendApp();
      CredProviderViewController.client = nil
    }
    self.extensionContext.cancelRequest(withError: NSError(domain: ASExtensionErrorDomain, code: ASExtensionError.userCanceled.rawValue))
  }
  
  func disconnectFromCard() {
    isFilled = false;
    
    if(CredProviderViewController.client != nil){
      //refactor//CredProviderViewController.client.requestSuspendApp();
      CredProviderViewController.client = nil
    }
    self.extensionContext.cancelRequest(withError: NSError(domain: ASExtensionErrorDomain, code: ASExtensionError.userCanceled.rawValue))
  }
  
  func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
    self.search_bar.showsCancelButton = true
  }
  
  func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
    self.search_bar.showsCancelButton = false
    self.search_bar.resignFirstResponder()
  }
  
  func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
    if(searchText != ""){
      var temp_filtered_Creds: [EtherCred] = []
      for creds in Creds{
        if(creds.server.lowercased().contains(searchText.lowercased()) || creds.username.lowercased().contains(searchText.lowercased())){
          temp_filtered_Creds.append(creds)
        }
      }
      self.filtered_Creds = temp_filtered_Creds
      
    }else{
      self.filtered_Creds = self.Creds
    }
    
    self.credTable.reloadData()
  }
  
  func randomString(length: Int) -> String {
    let letters = "abcdef0123456789"
    return String((0..<length).map{ _ in letters.randomElement()! })
  }
}

extension CredProviderViewController: PinCodeTextFieldDelegate{
  func textFieldValueChanged(_ textField: PinCodeTextField) {
    let value = textField.text ?? ""
    //print("value changed: \(value)")
    pinCode = ["\(value)"]
    
    if (textField.text!.count == _pin_length){
      submitBtn.isEnabled = true
      submitBtn.backgroundColor = UtilConstant.hexStringToUIColor(hex: "#cba830")
      
      CredProviderViewController.client.DoSubmitPin(pinCode : pinCode)
      isSubmitPIN = true
      
    }else {
      submitBtn.isEnabled = false
      submitBtn.backgroundColor = UtilConstant.hexStringToUIColor(hex: "#9E9E9E")
      
    }
  }
  
  func textFieldShouldEndEditing(_ textField: PinCodeTextField) -> Bool {
    return true
  }
  
  func textFieldShouldReturn(_ textField: PinCodeTextField) -> Bool {
    return true
  }
  
  func textFieldShouldBeginEditing(_ textField: PinCodeTextField) -> Bool {
    return true
  }
  
  func textFieldDidBeginEditing(_ textField: PinCodeTextField) {
    
  }
}
