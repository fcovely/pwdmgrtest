package com.ethernom.android.autofill.service;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.ethernom.android.autofill.service.adapter.EthBLEClientCallBack;
import com.ethernom.android.autofill.service.adapter.PINCallBack;
import com.psdmgr.R;

import java.util.ArrayList;

import cn.pedant.SweetAlert.SweetAlertDialog;

public class SaveAuthActivity extends AppCompatActivity implements EthBLEClientCallBack {
    private Toolbar toolbar;
    private EthBLEClient BLEClient;
    private String peripheralId;
    private BLEListeners listeners = new BLEListeners();
    private EditText displayname, url, username, password;
    private TextView tvProgressBar;
    private RelativeLayout rlProgressBar;
    private ProgressBar progressBar;

    private String usernameA, passwordA, packetName;
    private String PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL = "com.ethernom.password.manager.mobile.data.registered_peripheral";

    BluetoothManager btManager;
    BluetoothAdapter btAdapter;
    int REQUEST_ENABLE_BT = 2;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_save_auth);
        toolbar = findViewById(R.id.save_toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        getSupportActionBar().setDisplayShowHomeEnabled(true);
        displayname = findViewById(R.id.ed_display_name);
        url = findViewById(R.id.ed_url);
        username = findViewById(R.id.ed_username);
        password = findViewById(R.id.ed_password);
        tvProgressBar = findViewById(R.id.tv_progress_bar);
        rlProgressBar = findViewById(R.id.rl_progressbar);
        progressBar = findViewById(R.id.progressBar);

        usernameA = getIntent().getStringExtra("USER_NAME");
        passwordA = getIntent().getStringExtra("PASSWORD");
        packetName = getIntent().getStringExtra("PACKET_NAME");

        url.setText(packetName);
        username.setText(usernameA);
        password.setText(passwordA);


//        Permissions.check(this, Manifest.permission.ACCESS_FINE_LOCATION, "need permissions", new PermissionHandler() {
//            @Override
//            public void onGranted() {
//
//            }
//        });
        BLEClient = new EthBLEClient();
        SharedPreferences share = getApplicationContext().getSharedPreferences("wit_player_shared_preferences", getApplicationContext().MODE_PRIVATE);
        peripheralId = share.getString(PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL, null);


        btManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        btAdapter = btManager.getAdapter();
    }

    @Override
    protected void onStart() {
        super.onStart();
        // check bluetooth status
        if (btAdapter == null) {
            Toast.makeText(this, "Bluetooth not supported", Toast.LENGTH_LONG).show();
            Log.e("BleClientActivity: ", "Bluetooth not supported");
            finish();
        } else if (!btAdapter.isEnabled()) {
            // Make sure bluetooth is enabled.
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.menu_save_auth, menu);
        return true;
    }


    @SuppressLint("SetTextI18n")
    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) finish();
        if (item.getItemId() == R.id.nav_save_auth) {
            if (displayname.getText().toString().equals("") ||
                    url.getText().toString().equals("") ||
                    username.getText().toString().equals("") ||
                    password.getText().toString().equals("")) {
                rlProgressBar.setVisibility(View.VISIBLE);
                progressBar.setVisibility(View.GONE);
                tvProgressBar.setText("Require, Please complete info. every field can not be null");
            } else {
                if (peripheralId != null) {
                    hideKeyboard(this);
                    rlProgressBar.setVisibility(View.VISIBLE);
                    progressBar.setVisibility(View.VISIBLE);
                    tvProgressBar.setText(R.string.scanning_device);
                    BLEClient.initEthBLE(this, listeners, listeners, listeners, peripheralId, false);
                } else {
                    rlProgressBar.setVisibility(View.VISIBLE);
                    progressBar.setVisibility(View.GONE);
                    tvProgressBar.setText("Device not Register with Ethernom Password Manager App");
                }
            }
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onDeviceNotFound() {
        rlProgressBar.setVisibility(View.VISIBLE);
        progressBar.setVisibility(View.GONE);
        tvProgressBar.setText(R.string.device_not_found);
    }

    @Override
    public void onScanDevice() {
        rlProgressBar.setVisibility(View.VISIBLE);
        progressBar.setVisibility(View.VISIBLE);
        tvProgressBar.setText(R.string.scanning_device);
    }

    @Override
    public void onConnectDevice() {
        rlProgressBar.setVisibility(View.VISIBLE);
        progressBar.setVisibility(View.VISIBLE);
        tvProgressBar.setText(R.string.connecting_to_device);
    }

    @Override
    public void onAddAccSuccess() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    rlProgressBar.setVisibility(View.GONE);
                    //alertDialog("Success", "Save to card success.");
                    showSweetDialog(SweetAlertDialog.SUCCESS_TYPE, "SUCCESS", "Save to card success.", true);
                } catch (Exception ex) {
                    Log.d("xxx", "error : " + ex.getMessage());
                }
            }
        });

    }

    @Override
    public void onRequestInputPin() {

    }

    @Override
    public void onReplyPinNotMatch(Boolean isMatch) {
        PINCallBack a = (PINCallBack) this;
        if(isMatch){
            a.onPINMatch();
        } else {
            a.onPINNotMatch();
        }
    }

    @Override
    public void onCardReject() {
        finish();
    }

    public static void hideKeyboard(Activity activity) {
        InputMethodManager imm = (InputMethodManager) activity.getSystemService(Activity.INPUT_METHOD_SERVICE);
        //Find the currently focused view, so we can grab the correct window token from it.
        View view = activity.getCurrentFocus();
        //If no view currently has focus, create a new one, just so we can grab a window token from it
        if (view == null) {
            view = new View(activity);
        }
        imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
    }

    private String getPhoneName() {
        return BluetoothAdapter.getDefaultAdapter().getName();
    }

    @SuppressLint("HardwareIds")
    private String getPhoneId() {
        return Settings.Secure.getString(getContentResolver(),
                Settings.Secure.ANDROID_ID);
    }

    public class BLEListeners implements OnCardReadyEventListener, OnAccountFetchedListener, OnOperationCompleteListener {
        public void onCardReadyEvent() {
            Log.i("EthBLE", "card ready");
            String[] data = {getPhoneName(), "123456", getPhoneId()};
            BLEClient.WriteDataToCard(EthBLEClient.H2C_RQST_INIT, data);
        }


        public void OnAccountFetchedEvent(ArrayList<String> AccountData) {
            Log.i("EtherBLE", "account data fetched");

        }

        public void OnOperationCompleteEvent() {
            Log.i("tttt", "card op complete");
            checkAccountAlreadyExist();
        }

        @Override
        public void OnGetCustomerCompleteEvent(ArrayList<String> temp) {

        }

        @Override
        public void onAccountDuplicatesExact() {
            Log.d("xxyyxx", "onAccountDuplicatesExact");

            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        rlProgressBar.setVisibility(View.GONE);
                        //alertDialog("Success", "Save to card success.");
                        showSweetDialog(SweetAlertDialog.ERROR_TYPE, "ERROR", "The account is already exist", false);
                    } catch (Exception ex) {
                        Log.d("xxx", "error : " + ex.getMessage());
                    }
                }
            });
            BLEClient.onDisConnect();
        }

        @Override
        public void onAccountDuplicatesButDifferentPassword() {
            Log.d("xxyyxx", "onAccountDuplicatesButDifferentPassword");
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        rlProgressBar.setVisibility(View.GONE);
                        //alertDialog("Success", "Save to card success.");
                        showSweetDialog(SweetAlertDialog.ERROR_TYPE, "ERROR", "The account already exists, but it has a different password", false);
                    } catch (Exception ex) {
                        Log.d("xxx", "error : " + ex.getMessage());
                    }
                }
            });
            BLEClient.onDisConnect();
        }

        @Override
        public void onAccountNoDuplicatesFound() {
            AddAcc();
        }


        private void checkAccountAlreadyExist() {
            String[] data = {url.getText().toString(), username.getText().toString(), password.getText().toString(), displayname.getText().toString()};
            BLEClient.WriteDataToCard(EthBLEClient.H2C_RQST_CHECK_ACCOUNT, data);
        }

        public void AddAcc() {
            String[] data = {url.getText().toString(), username.getText().toString(), password.getText().toString(), displayname.getText().toString()};
            BLEClient.WriteDataToCard(EthBLEClient.H2C_RQST_ADD_ACCOUNT, data);
        }
    }

    private void showSweetDialog(int alertType, String title, String message, Boolean finish_activity) {
        SweetAlertDialog pDialog = new SweetAlertDialog(SaveAuthActivity.this, alertType);
        pDialog.getProgressHelper().setBarColor(Color.parseColor("#A5DC86"));
        pDialog.setTitleText(title);
        pDialog.setContentText(message);
        pDialog.setCancelable(false);
        pDialog.setConfirmClickListener(new SweetAlertDialog.OnSweetClickListener() {
            @Override
            public void onClick(SweetAlertDialog sweetAlertDialog) {
                if (finish_activity) {
                    finish();
                }
                pDialog.dismiss();
            }
        });
        pDialog.show();
    }


    @Override
    protected void onStop() {
        super.onStop();
        if (BLEClient != null)
            BLEClient.onDisConnect();
        finish();
    }
}
