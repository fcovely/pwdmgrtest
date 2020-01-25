package com.ethernom.android.autofill.service;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattCharacteristic;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.util.Log;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import android.os.ParcelUuid;

import com.ethernom.android.autofill.service.adapter.EthBLEClientCallBack;
import com.ethernom.android.autofill.service.adapter.PINCallBack;
import com.ethernom.android.autofill.service.util.Constant;

import java.util.UUID;


interface OnCardReadyEventListener {
    void onCardReadyEvent();
}

interface OnAccountFetchedListener {
    void OnAccountFetchedEvent(ArrayList<String> accounts);

}

interface OnOperationCompleteListener {
    void OnOperationCompleteEvent();

    void OnGetCustomerCompleteEvent(ArrayList<String> temp);

    void onAccountDuplicatesExact();

    void onAccountDuplicatesButDifferentPassword();

    void onAccountNoDuplicatesFound();
}


public class EthBLEClient {
    //*******************************************************************
    //BLE constant
    //*******************************************************************
    static String ETH_advServiceUUD = "19490016-5537-4f5e-99ca-290f4fbff142";
    static UUID ETH_serviceUUID = UUID.fromString("19490001-5537-4F5E-99CA-290F4FBFF142");
    static UUID ETH_characteristicUUID = UUID.fromString("19490002-5537-4F5E-99CA-290F4FBFF142");


    //*******************************************************************
    //Transport Header constant
    //*******************************************************************
    static int ETH_BLE_HEADER_SIZE = 8;
    static int ETH_BLE_PAYLOAD_HEAD = ETH_BLE_HEADER_SIZE + 1;
    static int ETH_BLE_INTERFACE = 2;
    static int DELIMITER = 31;
    static int INT8NULL = 0;

    //*******************************************************************
    //Password Manager constant
    //*******************************************************************
    static int PSD_MGR_PORT = (byte) 0x0D;
    static int EM_C2H = (byte) 0x80;
    static int EM_REPLY = (byte) 0x20;

    //host to card cmd: REQUEST
    static byte H2C_RQST_INIT = (byte) 0x01;
    static byte H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY = (byte) 0x03;
    static byte H2C_RQST_GET_ACCOUNT_PASS = (byte) 0x05;
    static byte H2C_RQST_ADD_ACCOUNT = (byte) 0x07;
    static byte H2C_RQST_CHECK_ACCOUNT = (byte) 0x06;

    //card to host cmd: REPLY
    static final byte C2H_RPLY_INIT = (byte) (H2C_RQST_INIT | EM_C2H | EM_REPLY); // CAL;
    static final byte C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY = (byte) (H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY | EM_C2H | EM_REPLY);
    static final byte C2H_RPLY_GET_ACCOUNT_PASS = (byte) (H2C_RQST_GET_ACCOUNT_PASS | EM_C2H | EM_REPLY);
    static final byte C2H_RPLY_ADD_ACCOUNT = (byte) (H2C_RQST_ADD_ACCOUNT | EM_C2H | EM_REPLY);
    static final byte C2H_RPLY_CHECK_ACCOUNT = (byte) (H2C_RQST_CHECK_ACCOUNT | EM_C2H | EM_REPLY);

    //card to host cmd: REQUEST
    static final byte C2H_RQST_PIN_ENTRY = (byte) (0x03 | EM_C2H);

    //host to card cmd: REPLY
    static final byte H2C_RPLY_PIN_ENTRY = (byte) (C2H_RQST_PIN_ENTRY | EM_REPLY);

    //response type
    static int AWK = (byte) 0x01;
    static int NAK = (byte) 0x00;
    static int OTHER = (byte) 0x02;

    //*******************************************************************
    //Generic constant
    //*******************************************************************
    static int GENERIC_PORT = (byte) 0x16;

    //host to card
    static int CM_LAUNCH_APP  = (byte) 0x81;
    static int CM_SUSPEND_APP = (byte) 0x82;

    //card to host
    static int CM_RSP = (byte) 0x01;

    //response type
    static int CM_ERR_SUCCESS         = (byte) 0x00;
    static int CM_ERR_CARD_BUSY       = (byte) 0x01;
    static int CM_ERR_INVALID_CMD     = (byte) 0x02;
    static int CM_ERR_APP_NOT_ALLOWED = (byte) 0x04;
    static int CM_ERR_INVALID_IMG_ID  = (byte) 0x08;
    static int CM_ERR_APP_BUSY        = (byte) 0x09;

    //*******************************************************************
    //Other
    //*******************************************************************
    private BluetoothAdapter adapter;
    private OnCardReadyEventListener cardReadyHandler;
    private OnOperationCompleteListener operationCompleteHandler;
    private OnAccountFetchedListener accountFetchedHandler;
    private BluetoothAdapter mBluetoothAdapter;
    private int REQUEST_ENABLE_BT = 1;
    private Handler mHandler;
    private static final long SCAN_PERIOD = 30000;
    private BluetoothLeScanner mLEScanner;
    private ScanSettings settings;
    private List<ScanFilter> filters;
    private Context context;
    private Context mContext;
    private BluetoothDevice periphEthCard;
    private BluetoothGatt gatt;
    private BluetoothGattCharacteristic ethCharacteristic;
    private String mPeripheralId;

    private EthBLEClientCallBack mEthBLEClientCallBack;
    private Boolean found = false;
    private Boolean mUseStatus;

    private String host_name = "";
    private String confirmation_code = "";
    private Boolean cancel_request = false;
    private Boolean auto_reconnect = false;

    public void initEthBLE(Context ctx, OnCardReadyEventListener cardReady, OnAccountFetchedListener accountFetched, OnOperationCompleteListener operationComplete, String peripheralId, Boolean useStatus) {
        mPeripheralId = peripheralId;
        cardReadyHandler = cardReady;
        operationCompleteHandler = operationComplete;
        accountFetchedHandler = accountFetched;
        context = ctx;
        mContext = ctx;
        mUseStatus = useStatus;

        mHandler = new Handler();
        final BluetoothManager bluetoothManager =
                (BluetoothManager) (context.getSystemService(Context.BLUETOOTH_SERVICE));
        mBluetoothAdapter = bluetoothManager.getAdapter();

        if (Build.VERSION.SDK_INT >= 21) {
            mLEScanner = mBluetoothAdapter.getBluetoothLeScanner();
            settings = new ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                    .build();
            filters = new ArrayList<ScanFilter>();

            ScanFilter.Builder builder = new ScanFilter.Builder();
            builder.setDeviceName("ETH!AAAAAAAAAAA");
            filters.add(builder.build());
            ScanFilter scanFilter = new ScanFilter.Builder()
                    .setServiceUuid(ParcelUuid.fromString(ETH_advServiceUUD))
                    .build();
            filters.add(scanFilter);
        }
        mHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                scanLeDevice(false);
                if (!found) {
                    Log.d("hhh", "Peripheral not found");
                    EthBLEClientCallBack a = (EthBLEClientCallBack) context;
                    a.onDeviceNotFound();
                }
            }
        }, 20000);
        scanLeDevice(true);

        //Toast.makeText(context, "Turned on",Toast.LENGTH_LONG).show();
    }

    private void scanLeDevice(final boolean enable) {
        if (enable) {
            mHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    mLEScanner.stopScan(mScanCallback);
                }
            }, SCAN_PERIOD);
            found = false;
            mLEScanner.startScan(filters, settings, mScanCallback);

        } else {
            mLEScanner.stopScan(mScanCallback);
        }
    }

    private ScanCallback mScanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            Log.i("callbackType", String.valueOf(callbackType));
            Log.i("result", result.toString());
            String devName = result.getDevice().getName();
            String devAddress = result.getDevice().getAddress();
            ParcelUuid[] devUUID = result.getDevice().getUuids();
            Integer devType = result.getDevice().getType();
//            Log.d("hhh", "devName : " + devName);
//            Log.d("hhh", "devAddress : " + devAddress);
//            Log.d("hhh", "devUUID : " + devUUID);
//            Log.d("hhh", "devType : " + devType);
            Log.d("hhh", "devAddress : " + devAddress);
            if (mPeripheralId.equals(devAddress)) {
                // Stop scan peripheral
                scanLeDevice(false);
                found = true;
                if (devName != null && devName.startsWith("ETH!")) {
                    // start connecting to peripheral
                    EthBLEClientCallBack a = (EthBLEClientCallBack) context;
                    a.onConnectDevice();
                    mLEScanner.stopScan(mScanCallback);
                    periphEthCard = result.getDevice();
                    gatt = periphEthCard.connectGatt(context, true, gattCallback);
                    /*
                    SparseArray<byte[]> mdata = result.getScanRecord().getManufacturerSpecificData();
                    for (int i = 0; i < mdata.size(); i++) {
                        byte[] mfdata = mdata.get(mdata.keyAt(i));
                        if (mfdata != null && mfdata.length == 3) {
                            // convert signed byte type to unsigned int
//                        if (manufacturerData[0] == 0x31 && manufacturerData[1] == 1 && manufacturerData[2] == 0x42 && manufacturerData[3] == 0xF1 && manufacturerData[4] == PSD_MGR_PORT) {
                            int[] manufacturerData = toUnsignedIntArray(mfdata);
                            if (manufacturerData[0] == 0x42 && manufacturerData[1] == 0xF1 && manufacturerData[2] == PSD_MGR_PORT) {
                                Log.i("mfctr data ", "found ethernom");

                                // start connecting to peripheral
                                EthBLEClientCallBack a = (EthBLEClientCallBack) context;
                                a.onConnectDevice();

                                mLEScanner.stopScan(mScanCallback);
                                periphEthCard = result.getDevice();
                                gatt = periphEthCard.connectGatt(context, true, gattCallback);

                            }
                        }
                    }
                    */
                }
            }

        }

        @Override
        public void onBatchScanResults(List<ScanResult> results) {
            for (ScanResult sr : results) {
                Log.d("hhh", "ScanResult - Results + " + sr.toString());
            }
        }

        @Override
        public void onScanFailed(int errorCode) {
            Log.e("Scan Failed", "Error Code: " + errorCode);
        }

        private int[] toUnsignedIntArray(byte[] barray) {
            int[] ret = new int[barray.length];
            for (int i = 0; i < barray.length; i++) {
                ret[i] = barray[i] & 0xff; // Range 0 to 255, not -128 to 127
            }
            return ret;
        }

        public UUID convertFromInteger(int i) {
            final long MSB = 0x0000000000001000L;
            final long LSB = 0x800000805f9b34fbL;
            long value = i & 0xFFFFFFFF;
            return new UUID(MSB | (value << 32), LSB);
        }

        private void reconnect() {
            auto_reconnect = false;
            gatt = periphEthCard.connectGatt(context, true, gattCallback);
        }

        final BluetoothGattCallback gattCallback =
                new BluetoothGattCallback() {
                    @Override
                    public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                        if (newState == BluetoothGatt.STATE_CONNECTED) {
                            gatt.discoverServices();
                        }else if(newState == BluetoothGatt.STATE_DISCONNECTED){
                            if(auto_reconnect == true){
                                reconnect();
                            }
                        }
                    }

                    @Override
                    public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                        ethCharacteristic = gatt.getService(ETH_serviceUUID).getCharacteristic(ETH_characteristicUUID);
                        UUID CLIENT_CHARACTERISTIC_CONFIG_UUID = convertFromInteger(0x2902);
                        if (ethCharacteristic != null) {
                            BluetoothGattDescriptor descriptor = ethCharacteristic.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG_UUID);
                            if (descriptor != null) {
                                descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                                gatt.setCharacteristicNotification(ethCharacteristic, true);
                                gatt.writeDescriptor(descriptor);
                            }
                            //gatt.setCharacteristicNotification(ethCharacteristic, true);
                        }
                    }

                    @Override
                    public void onDescriptorWrite(BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
                        if (cardReadyHandler != null)
                            cardReadyHandler.onCardReadyEvent();
                    }

                    @Override
                    public void onCharacteristicWrite(BluetoothGatt gatt,
                                                      BluetoothGattCharacteristic characteristic,
                                                      int status) {
                        if (status != 0)
                            Log.i("EtherBLE", "oncharacteristicwrite failed write");
                        else {
                            Log.i("EtherBLE", "oncharacteristicwrite success");

                        }
                    }

                    @Override
                    public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
                        if (status != 0)
                            Log.i("EtherBLE", "oncharacteristicread failed write");
                        else
                            Log.i("EtherBLE", "oncharacteristicread success");
                    }

                    @Override
                    public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
                        byte[] value = characteristic.getValue();
                        if (value[0] == PSD_MGR_PORT) {
                            Log.d("xxx", "------------PSD_MGR_PORT------------" + value[ETH_BLE_HEADER_SIZE]);
                            if (value[ETH_BLE_HEADER_SIZE] == C2H_RQST_PIN_ENTRY) {
                                //--------------------------------------------------
                                //-------------- Attention to IG TEAM --------------
                                //--------------------------------------------------
                                //...
                                //PROMPT UI for user to enter 6 digit PIN code
                                //...


                                EthBLEClientCallBack a = (EthBLEClientCallBack) context;

                                if (!Constant.PIN_NOT_MATCH){
                                    Constant.PIN_NOT_MATCH = true;
                                    a.onRequestInputPin();
                                } else {
                                    a.onReplyPinNotMatch(false);
                                }

                                if(value[ETH_BLE_HEADER_SIZE + 1] == NAK){
                                    Log.d("xxx", "CNN NAK");
                                } else if(value[ETH_BLE_HEADER_SIZE + 1] == AWK){
                                    Log.d("xxx", "CNN AWK");

                                } else if(value[ETH_BLE_HEADER_SIZE + 1] == OTHER){
                                    Log.d("xxx", "CNN OTHER");

                                } else {
                                    Log.d("xxx", "CNN ELSE");

                                }



                            } else if (value[ETH_BLE_HEADER_SIZE] == C2H_RPLY_INIT) {
                                if (value[ETH_BLE_HEADER_SIZE + 1] == AWK) {
                                    byte[] data = new byte[1];
                                    data[0] = 0;
                                    WriteDataToCard(H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY, data);
                                    EthBLEClientCallBack a = (EthBLEClientCallBack) context;
                                    a.onReplyPinNotMatch(true);

                                } else if(value[ETH_BLE_HEADER_SIZE + 1] == NAK){
                                    Log.d("xxx", "--------------------CNN NAK---------------");
                                    EthBLEClientCallBack eth = (EthBLEClientCallBack) context;
                                    eth.onCardReject();
                                    gatt.close();

                                } else {
                                    EthBLEClientCallBack eth = (EthBLEClientCallBack) context;
                                    //requestSuspendApp();
                                    gatt.close();
                                }

                            } else if (value[ETH_BLE_HEADER_SIZE] == C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY) {
                                if (value[ETH_BLE_HEADER_SIZE + 1] == AWK) {
                                    ArrayList<String> temp = decomposeBLEPacket(C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY, value);
                                    if (accountFetchedHandler != null && temp.size() > 0)
                                        accountFetchedHandler.OnAccountFetchedEvent(temp);
                                    byte[] data = new byte[1];
                                    data[0] = value[ETH_BLE_HEADER_SIZE + 2];
                                    WriteDataToCard(H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY, data);

                                } else if (value[ETH_BLE_HEADER_SIZE + 1] == OTHER) {
                                    if (operationCompleteHandler != null)
                                        operationCompleteHandler.OnOperationCompleteEvent();
                                }

                            } else if (value[ETH_BLE_HEADER_SIZE] == C2H_RPLY_GET_ACCOUNT_PASS) {
                                if (value[ETH_BLE_HEADER_SIZE + 1] == AWK) {
                                    //got the password
                                    //decompose data, contains url, username and password
                                    ArrayList<String> temp = decomposeBLEPacket(C2H_RPLY_GET_ACCOUNT_PASS, value);
                                    Log.d("PASSWORD_DATA_QQQ1: ", Arrays.toString(value) + "");
                                    Log.d("PASSWORD_DATA_QQQ: ", temp + "");
                                    operationCompleteHandler.OnGetCustomerCompleteEvent(temp);

                                    EthBLEClientCallBack eth = (EthBLEClientCallBack) context;
                                    //requestSuspendApp();
                                    gatt.close();
                                } else {
                                    Log.d("PASSWORD_DATA_REJECT: ", Arrays.toString(value));
                                    //reject retrieve password
                                }

                            } else if (value[ETH_BLE_HEADER_SIZE] == C2H_RPLY_ADD_ACCOUNT) {
                                if (value[ETH_BLE_HEADER_SIZE + 1] == AWK) {
                                    EthBLEClientCallBack eth = (EthBLEClientCallBack) context;
                                    eth.onAddAccSuccess();
                                    //requestSuspendApp();
                                    gatt.close();
                                } else {
                                    //reject retrieve password
                                }

                            } else if (value[ETH_BLE_HEADER_SIZE] == C2H_RPLY_CHECK_ACCOUNT) {
                                if (value[ETH_BLE_HEADER_SIZE + 1] == AWK) {
                                    operationCompleteHandler.onAccountDuplicatesButDifferentPassword();
                                } else if (value[ETH_BLE_HEADER_SIZE + 1] == OTHER) {
                                    operationCompleteHandler.onAccountDuplicatesExact();
                                } else if (value[ETH_BLE_HEADER_SIZE + 1] == NAK) {
                                    operationCompleteHandler.onAccountNoDuplicatesFound();
                                } else {
                                    Log.i("EtherBLE", "unrecognized command sequence recv from card");
                                }

                            } else {
                                Log.i("EtherBLE", "unrecognized command sequence recv from card");
                            }

                        } else if (value[0] == GENERIC_PORT) {
                            if (value[ETH_BLE_HEADER_SIZE] == CM_RSP) {
                                if (value[12] == CM_ERR_SUCCESS){
                                    if (auto_reconnect == false && cancel_request == false){
                                        Log.i("EthBLE", "card ready");

                                        String id = mPeripheralId;
                                        if (mPeripheralId.length() > 20) {
                                            id = mPeripheralId.substring(0, 20);
                                        }

                                        String[] data = {host_name, confirmation_code, id};
                                        WriteDataToCard(EthBLEClient.H2C_RQST_INIT, data);
                                        //WriteDataToCard(cmd : H2C_RQST_INIT, data: [host_name, confirmation_code, host_id])
                                    } else {
                                        cancel_request = false;
                                        scanLeDevice(false);
                                    }

                                }else if(value[12] == CM_ERR_APP_BUSY){
                                    auto_reconnect = true;
                                    requestSuspendApp();
                                }
                            }
                        }
                    }
                };

    };

    public void getSpecifyPassword(String[] data) {
        Log.d("_DATA_", Arrays.toString(data));
        WriteDataToCard(H2C_RQST_GET_ACCOUNT_PASS, data);
    }

    public void onDisConnect() {
        if (gatt != null) {
            scanLeDevice(false);
            operationCompleteHandler.OnOperationCompleteEvent();
            gatt.disconnect();
            gatt.close();
        }
    }

    void confirmPin(String pin) {
        String[] data = {pin};

    }

    private static final char[] HEX_ARRAY = "0123456789ABCDEF".toCharArray();

    public static String bytesToHex(byte[] bytes) {
        char[] hexChars = new char[bytes.length * 2];
        for (int j = 0; j < bytes.length; j++) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = HEX_ARRAY[v >>> 4];
            hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];
        }
        return new String(hexChars);
    }

    //*******************************************************************
    //Password Manager transport protocol
    //*******************************************************************
    public void WriteDataToCard(byte cmd, String[] data) {
        byte[] packet = composeBLEPacket(cmd, data);
        Log.i("EtherBLE", "write data to card");
        Log.i("EtherBLE", "write data to card : " + cmd);

        Log.i("EtherBLENN", bytesToHex(packet));
        Log.i("EtherBLENN", ethCharacteristic.toString());
        ethCharacteristic.setValue(packet);
        gatt.writeCharacteristic(ethCharacteristic);
    }

    public void WriteDataToCard(byte cmd, byte[] data) {
        byte[] packet = composeBLEPacket(cmd, data);
        Log.i("EtherBLE", "write data to card");
        Log.i("EtherBLE", bytesToHex(packet));
        ethCharacteristic.setValue(packet);
        gatt.writeCharacteristic(ethCharacteristic);
    }

    public void WriteDataToCard(byte cmd) {
        byte[] packet = composeBLEPacket(cmd);
        Log.i("EtherBLE", "write command data to card");
        Log.i("EtherBLE", bytesToHex(packet));
        ethCharacteristic.setValue(packet);
        gatt.writeCharacteristic(ethCharacteristic);
    }

    private byte[] composeBLEPacket(int cmd) {
        // Construct payload as series of delimited strings
        List<Byte> payload = new ArrayList<Byte>();
        payload.add((byte) cmd);
        payload.add((byte) 0);
        return MakeSendablePacket(payload);
    }

    private byte[] composeBLEPacket(int cmd, byte[] data) {
        // Construct payload as series of delimited stringsƒsƒs
        List<Byte> payload = new ArrayList<Byte>();
        payload.add((byte) cmd);
        for (int i = 0; i != data.length; i++)
            payload.add(data[i]);
        return MakeSendablePacket(payload);
    }

    private byte[] composeBLEPacket(int cmd, String[] data) {
        // Construct payload as series of delimited strings
        List<Byte> payload = new ArrayList<Byte>();
        payload.add((byte) cmd);
        if (data.length == 0) {
            payload.add((byte) 0);
        } else {
            int cc = 0;
            for (int i = 0; i != data.length; i++) {
                String item = data[i];
                for (int j = 0; j != item.length(); j++) {
                    char c = item.charAt(j);
                    byte b = (byte) c;
                    payload.add(b);
                }
                if (cc < data.length - 1) {
                    payload.add((byte) DELIMITER);
                }
                cc = cc + 1;
            }
            payload.add((byte) 0);
        }

        return MakeSendablePacket(payload);
    }

    private byte[] MakeSendablePacket(List<Byte> payload) {
        byte[] payloadBytes = new byte[payload.size()];
        for (int i = 0; i < payload.size(); i++) {
            payloadBytes[i] = (byte) payload.get(i);
        }
        // Length of payload (without Transport Header), get back a viable header missing only the checksum

        byte[] packetHeader = getInitedPacked(payload.size());
        byte[] c = new byte[packetHeader.length + payloadBytes.length];
        System.arraycopy(packetHeader, 0, c, 0, packetHeader.length);
        System.arraycopy(payloadBytes, 0, c, packetHeader.length, payloadBytes.length);
        return c;
    }

    private byte[] getInitedPacked(int payloadLength) {
        byte[] packet = new byte[8];
        packet[0] = (byte) (PSD_MGR_PORT | 0x80);
        packet[1] = (byte) PSD_MGR_PORT;
        packet[2] = (byte) 0;
        packet[3] = (byte) ETH_BLE_INTERFACE;

        // length bytes, length is 2 bytes
        int Value0 = payloadLength & 0x00ff;
        int Value1 = payloadLength >> 8;
        packet[4] = (byte) Value0;
        packet[5] = (byte) Value1;
        packet[6] = (byte) 0;
        packet[7] = (byte) 0;

        int xorValue = packet[0];

        // xor the packet header for checksum
        int i = 0;
        for (int j = 1; j != 7; j++) {
            int c = packet[j];
            xorValue = xorValue ^ c;
        }

        packet[7] = (byte) xorValue;
        return packet;
    }

    //*******************************************************************
    //Password Manager transport protocol
    //*******************************************************************
    public void requestLaunchApp(String name, String code) {
        if (gatt != null) {
            byte[] payload = new byte[5];
            payload[0] = (byte) CM_LAUNCH_APP;
            payload[1] = (byte) INT8NULL;
            payload[2] = 1;
            payload[3] = (byte) INT8NULL;
            payload[4] = (byte) PSD_MGR_PORT;

            if (name.length() > 30) {
                host_name = name.substring(0, 30);
            } else {
                host_name = name;
            }
            confirmation_code = code;

            WriteDataToCard_Generic(payload);
        }
    }

    public void requestSuspendApp() {
        if (gatt != null) {
            if(auto_reconnect == false) cancel_request = true;
            byte[] payload = new byte[5];
            payload[0] = (byte) CM_SUSPEND_APP;
            payload[1] = (byte) INT8NULL;
            payload[2] = 1;
            payload[3] = (byte) INT8NULL;
            payload[4] = (byte) INT8NULL;

            WriteDataToCard_Generic(payload);
        } else {
            onDisConnect();
        }
    }

    public void WriteDataToCard_Generic(byte[] data) {
        byte[] packet = composeBLEPacket_Generic(data);
        Log.i("EtherBLE", "write data to card");
        Log.i("EtherBLE", bytesToHex(packet));
        ethCharacteristic.setValue(packet);
        gatt.writeCharacteristic(ethCharacteristic);
    }

    private byte[] composeBLEPacket_Generic(byte[] data) {
        // Construct payload as series of delimited stringsƒsƒs
        List<Byte> payload = new ArrayList<Byte>();
        for (int i = 0; i != data.length; i++)
            payload.add(data[i]);
        return MakeSendablePacket_Generic(payload);
    }

    private byte[] MakeSendablePacket_Generic(List<Byte> payload) {
        byte[] payloadBytes = new byte[payload.size()];
        for (int i = 0; i < payload.size(); i++) {
            payloadBytes[i] = (byte) payload.get(i);
        }
        // Length of payload (without Transport Header), get back a viable header missing only the checksum

        byte[] packetHeader = getInitedPacked_Generic(payload.size());
        byte[] c = new byte[packetHeader.length + payloadBytes.length];
        System.arraycopy(packetHeader, 0, c, 0, packetHeader.length);
        System.arraycopy(payloadBytes, 0, c, packetHeader.length, payloadBytes.length);
        return c;
    }

    private byte[] getInitedPacked_Generic(int payloadLength) {
        byte[] packet = new byte[8];
        packet[0] = (byte) (GENERIC_PORT | 0x80);
        packet[1] = (byte) GENERIC_PORT;
        packet[2] = (byte) 0;
        packet[3] = (byte) ETH_BLE_INTERFACE;

        // length bytes, length is 2 bytes
        int Value0 = payloadLength & 0x00ff;
        int Value1 = payloadLength >> 8;
        packet[4] = (byte) Value0;
        packet[5] = (byte) Value1;
        packet[6] = (byte) 0;
        packet[7] = (byte) 0;

        int xorValue = packet[0];

        // xor the packet header for checksum
        int i = 0;
        for (int j = 1; j != 7; j++) {
            int c = packet[j];
            xorValue = xorValue ^ c;
        }

        packet[7] = (byte) xorValue;
        return packet;
    }

    //*******************************************************************
    // MARK: - Utilities
    //*******************************************************************
    String getStringRepresentation(ArrayList<Character> list) {
        StringBuilder builder = new StringBuilder(list.size());
        for (Character ch : list) {
            builder.append(ch);
        }
        return builder.toString();
    }

    private ArrayList<String> decomposeBLEPacket(byte cmd, byte[] data) {
        ArrayList<String> items = new ArrayList<>();
        ArrayList<Character> temp = new ArrayList<>();

        int startingPoint = ETH_BLE_PAYLOAD_HEAD + 1;
        if (cmd == C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY) {
            startingPoint += 2;
        }

        int i = 0;
        for (int j = 0; j != data.length; j++) {
            if (i >= startingPoint) {
                byte uc = data[j];
                if (uc == DELIMITER || uc == (byte) 0x00) {
                    String s = getStringRepresentation(temp);

                    items.add(s);
                    temp.clear();
                } else {
                    temp.add((char) uc);
                }
            }
            i += 1;
        }

        return items;
    }

    /*
    private ArrayList<String> decomposeBLEPacketP(byte cmd, byte[] data) {
        ArrayList<String> items = new ArrayList<>();
        ArrayList<Character> temp = new ArrayList<>();
        int startingPoint = ETH_BLE_PAYLOAD_HEAD + 1;

        if(cmd == C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY){
            startingPoint += 2;
        }

        int i = 0;
        for (int j = 0; j != data.length; j++) {
            if (i >= startingPoint) {
                byte uc = data[j];
                Log.d("PASSWORD_DATA_QQQA", uc+"");
                if (uc == DELIMITER) {
                    String s = getStringRepresentation(temp);
                    Log.d("PASSWORD_DATA_QQQB", s+"");
                    items.add(s);
                    temp.clear();
                } else if(j == data.length-1) {
                    String s = getStringRepresentation(temp);
                    Log.d("PASSWORD_DATA_QQQB", s+"");
                    items.add(s);
                    temp.clear();
                }
                else {
                    temp.add((char) uc);
                }
            }
            i += 1;
        }

        return items;
    }
    */
}
