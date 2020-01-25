/*
 * Copyright (C) 2017 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.ethernom.android.autofill.service;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PendingIntent;
import android.app.assist.AssistStructure;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.service.autofill.Dataset;
import android.service.autofill.FillResponse;
import android.service.autofill.SaveInfo;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.ArrayMap;
import android.util.Log;
import android.view.MenuItem;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.RemoteViews;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SearchView;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.chaos.view.PinView;
import com.ethernom.android.autofill.service.adapter.AccountAdapter;
import com.ethernom.android.autofill.service.adapter.EthBLEClientCallBack;
import com.ethernom.android.autofill.service.adapter.OnHomePressedListener;
import com.ethernom.android.autofill.service.adapter.RecyclerViewClickListener;
import com.ethernom.android.autofill.service.data.ClientViewMetadata;
import com.ethernom.android.autofill.service.data.ClientViewMetadataBuilder;
import com.ethernom.android.autofill.service.data.DataCallback;
import com.ethernom.android.autofill.service.data.adapter.DatasetAdapter;
import com.ethernom.android.autofill.service.data.adapter.ResponseAdapter;
import com.ethernom.android.autofill.service.data.source.DefaultFieldTypesSource;
import com.ethernom.android.autofill.service.data.source.local.DefaultFieldTypesLocalJsonSource;
import com.ethernom.android.autofill.service.data.source.local.LocalAutofillDataSource;
import com.ethernom.android.autofill.service.data.source.local.dao.AutofillDao;
import com.ethernom.android.autofill.service.data.source.local.db.AutofillDatabase;
import com.ethernom.android.autofill.service.model.FieldTypeWithHeuristics;
import com.ethernom.android.autofill.service.settings.MyPreferences;
import com.ethernom.android.autofill.service.util.AppExecutors;
import com.ethernom.android.autofill.service.util.Constant;
import com.ethernom.android.autofill.service.util.HomeWatcher;
import com.ethernom.android.autofill.service.util.UtilLibSessionMgr;
import com.psdmgr.R;
import com.google.gson.GsonBuilder;
import com.nabinbhandari.android.permissions.PermissionHandler;
import com.nabinbhandari.android.permissions.Permissions;

import java.util.ArrayList;
import java.util.Objects;

import static android.view.autofill.AutofillManager.EXTRA_ASSIST_STRUCTURE;
import static android.view.autofill.AutofillManager.EXTRA_AUTHENTICATION_RESULT;
import static com.ethernom.android.autofill.service.util.Util.EXTRA_DATASET_NAME;
import static com.ethernom.android.autofill.service.util.Util.EXTRA_FOR_RESPONSE;
import static com.ethernom.android.autofill.service.util.Util.logw;


/**
 * This Activity controls the UI for logging in to the Autofill service.
 * It is launched when an Autofill Response or specific Dataset within the Response requires
 * authentication to access. It bundles the result in an Intent.
 */

@RequiresApi(api = Build.VERSION_CODES.O)
public class AuthActivity extends AppCompatActivity implements EthBLEClientCallBack, RecyclerViewClickListener {

    private static final String TAG = "Ethernom";
    // Unique id for dataset intents.
    private static int sDatasetPendingIntentId = 0;
    private static final int REQUEST_ENABLE_BT = 1;

    private LocalAutofillDataSource mLocalAutofillDataSource;
    private DatasetAdapter mDatasetAdapter;
    private ResponseAdapter mResponseAdapter;
    private ClientViewMetadata mClientViewMetadata;
    private String mPackageName;
    private Intent mReplyIntent;
    private MyPreferences mPreferences;

    private Toolbar mAuthToolbar;
    private RecyclerView rcvAccoutList;
    private RelativeLayout relativeLayout;
    private SearchView editTextSearch;
    private LinearLayout authLayout;
    private TextView tvDeviceNotfound, tvPeripheralName, tvPeripheralId;
    private ArrayList<String> accoutnList;
    private LinearLayoutManager layoutManager;
    private AccountAdapter accountAdapter;
    private String peripheralId;
    private String peripheralName;
    private TextWatcher textWatcher;
    private TextView tvScanDevice;
    private ProgressBar progressBar;

    private TextView txtErrPin;
    private Button btnSubmit;
    private PinView pinView;
    private LinearLayout lnPin;

    private Boolean appState;

    BLEListeners listeners = new BLEListeners();
    private ArrayList<EtherEntry> etherDataList;
    private EthBLEClient BLEClient;
    Activity thisActivity;
    ListView listView;
    BluetoothManager btManager;
    BluetoothAdapter btAdapter;

    private UtilLibSessionMgr mSession;
    private String phoneName, phoneId;

    private String PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL = "com.ethernom.password.manager.mobile.data.registered_peripheral";
    private String PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL_NAME = "com.ethernom.password.manager.mobile.data.registered_peripheral_name";

    @Override
    public void onClick(int position, EtherEntry etherEntry) {
        String[] data = {etherEntry.URL, etherEntry.username};
        Log.d("_DATA", Arrays.toString(data) + "");
        //BLEClient.getSpecifyPassword(data);
        BLEClient.WriteDataToCard(EthBLEClient.H2C_RQST_GET_ACCOUNT_PASS, data);
        //fetchItemDataSet(etherEntry);
    }


    //--------------------------------------------------
    //-------------- Attention to IG TEAM --------------
    //--------------------------------------------------
    //WHEN USER SUBMIT PIN
    public void onPINSubmit(String pin) {
        //REPLACE "012345" with current PIN input by user
        String[] data = {pin};
        Log.d("_PIN", Arrays.toString(data) + "");
        BLEClient.WriteDataToCard(EthBLEClient.H2C_RPLY_PIN_ENTRY, data);
    }

    public class EtherEntry {
        public String username;
        public String password;
        public String URL;
    }

    @Override
    protected void onStop() {
        super.onStop();
        Log.d("ccccccc", "onStop : " + Constant.appState);
        if (BLEClient != null)
            BLEClient.onDisConnect();
        finish();

    }


    @Override
    protected void onResume() {
        super.onResume();
        //handleHomePress();
        Log.d("cccccc ", "onResume");

    }

    /**
     * PIN Text Watcher Listener
     **/
    private TextWatcher textWatcher() {
        return new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (s.length() < 6) enableBtnNext(false);
                else enableBtnNext(true);
            }

            @Override
            public void afterTextChanged(Editable s) {

            }
        };
    }


    /**
     * Enable Bnt Submit PIN
     **/
    private void enableBtnNext(Boolean enable) {
        if (enable) {
            btnSubmit.setBackground(getDrawable(R.drawable.bg_btn_enable));
            hideKeyboard(this);
        } else {
            btnSubmit.setBackground(getDrawable(R.drawable.bg_btn_disable));

        }
    }

    /**
     * Handle Listening click home press
     **/
    private void handleHomePress() {
        HomeWatcher mHomeWatcher = new HomeWatcher(this);
        mHomeWatcher.setOnHomePressedListener(new OnHomePressedListener() {
            @Override
            public void onHomePressed() {
                // do something here...
                try {
                    onStop();
                    //onDestroy();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            @Override
            public void onHomeLongPressed() {
                Log.d("xxx", "onHomeLongPressed");
            }
        });
        mHomeWatcher.startWatch();
    }

    /**
     * init property input pin and submit pin
     **/
    private void initProps() {
        txtErrPin = findViewById(R.id.txtErrPin);
        btnSubmit = findViewById(R.id.btnSubmit);
        lnPin = findViewById(R.id.lnPin);
        pinView = findViewById(R.id.pinView);
        txtErrPin.setVisibility(View.GONE);
        lnPin.setVisibility(View.GONE);
        pinView.addTextChangedListener(textWatcher());
        pinView.setFocusable(true);
        lnPin.setOnClickListener(v -> {
            hideKeyboard(this);
        });
        btnSubmit.setOnClickListener(v -> {
            if (Objects.requireNonNull(pinView.getText()).length() == 6) {
                onPINSubmit(pinView.getText().toString());
            }
        });

        Constant.PIN_NOT_MATCH = false;

    }


    public class BLEListeners implements OnCardReadyEventListener, OnAccountFetchedListener, OnOperationCompleteListener {
        public void onCardReadyEvent() {
            Log.i("EthBLE", "card ready");
            etherDataList.clear();
            BLEClient.requestLaunchApp(getPhoneName(), "123456");
            /*
            Log.i("EthBLE", "card ready");
            String[] data = {getPhoneName(), "123456", getPhoneId()};
            etherDataList.clear();
            BLEClient.WriteDataToCard(EthBLEClient.H2C_RQST_INIT, data);
             */
        }

        public void OnAccountFetchedEvent(ArrayList<String> AccountData) {
            Log.i("EtherBLE", "account data fetched");
            for (int i = 0; i < AccountData.size(); i++) {
                String s = AccountData.get(i);
                Log.i("EtherBLE", s);
            }

            Log.d("xxx", "username : " + AccountData.get(0));
            Log.d("xxx", "password : " + AccountData.get(1));

            EtherEntry etherentry = new EtherEntry();
            etherentry.URL = AccountData.get(0);
            etherentry.username = AccountData.get(1);
//            etherentry.password = AccountData.get(2);
            boolean add = true;
            for (int i = 0; i != etherDataList.size(); i++) {
                EtherEntry e = etherDataList.get(i);
                if (e.username.compareTo(etherentry.username) == 0 && e.username.compareTo(etherentry.username) == 0 && e.URL.compareTo(etherentry.URL) == 0) {
                    add = false;
                    break;
                }
            }
            if (add)
                etherDataList.add(etherentry);
        }

        public void OnOperationCompleteEvent() {
            Log.i("tttt", "card op complete");
            onSuccess();
        }

        public void OnGetCustomerCompleteEvent(ArrayList<String> temp) {
            EtherEntry a = new EtherEntry();
            a.URL = temp.get(0);
            a.username = temp.get(1);
            a.password = temp.get(2);
            fetchItemDataSet(a);
        }

        @Override
        public void onAccountDuplicatesExact() {

        }

        @Override
        public void onAccountDuplicatesButDifferentPassword() {

        }

        @Override
        public void onAccountNoDuplicatesFound() {

        }

    }


    public static IntentSender getAuthIntentSenderForResponse(Context context) {
        final Intent intent = new Intent(context, AuthActivity.class);
        return PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_CANCEL_CURRENT).getIntentSender();
    }

    public static IntentSender getAuthIntentSenderForDataset(Context originContext,
                                                             String datasetName) {
        Intent intent = new Intent(originContext, AuthActivity.class);
        intent.putExtra(EXTRA_DATASET_NAME, datasetName);
        intent.putExtra(EXTRA_FOR_RESPONSE, false);
        return PendingIntent.getActivity(originContext, ++sDatasetPendingIntentId, intent,
                PendingIntent.FLAG_CANCEL_CURRENT).getIntentSender();
    }


    @Override
    protected void onStart() {
        super.onStart();
        if (btAdapter == null) {
            Toast.makeText(this, "Bluetooth Not Supported", Toast.LENGTH_LONG).show();
            Log.e("BleClientActivity: ", "Bluetooth not supported");
            finish();
        } else if (!btAdapter.isEnabled()) {
            // Make sure bluetooth is enabled.
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
        }
    }


    private String capitalize(String s) {
        if (s == null || s.length() == 0) {
            return "";
        }
        char first = s.charAt(0);
        if (Character.isUpperCase(first)) {
            return s;
        } else {
            return Character.toUpperCase(first) + s.substring(1);
        }
    }

    private String getPhoneName() {
        return BluetoothAdapter.getDefaultAdapter().getName();
    }

    @SuppressLint("HardwareIds")
    private String getPhoneId() {
        return Settings.Secure.getString(getContentResolver(),
                Settings.Secure.ANDROID_ID);
    }

    public static void hideKeyboard(Activity activity) {
        View view = activity.getCurrentFocus();
        if (view != null) {
            InputMethodManager imm = (InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
        }
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        thisActivity = this;
        mSession = new UtilLibSessionMgr(thisActivity);

        phoneName = getPhoneName();
        phoneId = getPhoneId();

        btManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        btAdapter = btManager.getAdapter();

        if (btAdapter == null) {
            Toast.makeText(this, "Bluetooth not supported", Toast.LENGTH_LONG).show();
            Log.e("BleClientActivity: ", "Bluetooth not supported");
            finish();
        } else if (!btAdapter.isEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
            finish();
        }

        Permissions.check(this, Manifest.permission.ACCESS_FINE_LOCATION, "need permissions", new PermissionHandler() {
            @Override
            public void onGranted() {
                Log.d("ethernom", "onGranted");
                etherDataList = new ArrayList<>();
                setContentView(R.layout.multidataset_service_auth_activity);

                mAuthToolbar = findViewById(R.id.auth_toolbar);
                rcvAccoutList = findViewById(R.id.rcv_account);
                relativeLayout = findViewById(R.id.rl_progressbar);
                editTextSearch = findViewById(R.id.ed_search);
                authLayout = findViewById(R.id.authLayout);
                tvDeviceNotfound = findViewById(R.id.tv_not_found);
                tvPeripheralName = findViewById(R.id.tv_peripheral_name);
                tvPeripheralId = findViewById(R.id.tv_peripheral_id);
                tvScanDevice = findViewById(R.id.tv_scan_device);
                progressBar = findViewById(R.id.progressBar);

                initProps();

                editTextSearch.onActionViewExpanded();
                if (Objects.equals(mSession.getPackage(), "chrome.com") || Objects.equals(mSession.getPackage(), "firefox.com") || mSession.getPackage().equals("edge.com")) {
                    editTextSearch.setQuery("", false);
                } else {
                    editTextSearch.setQuery(mSession.getPackage(), false);
                }

                hideKeyboard(thisActivity);
                editTextSearch.clearFocus();
                editTextSearch.setFocusable(false);


                editTextSearch.setOnQueryTextListener(searchView());


                tvScanDevice.setText(R.string.scanning_device);
                setSupportActionBar(mAuthToolbar);
                getSupportActionBar().setDisplayHomeAsUpEnabled(true);
                getSupportActionBar().setDisplayShowHomeEnabled(true);
                initRecyclerView();
                SharedPreferences share = getApplicationContext().getSharedPreferences("wit_player_shared_preferences", getApplicationContext().MODE_PRIVATE);


                peripheralId = share.getString(PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL, null);
                peripheralName = share.getString(PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL_NAME, null);
                tvPeripheralName.setText("Name: " + peripheralName);
                tvPeripheralId.setText("ID: " + peripheralId);

                SharedPreferences sharedPreferences =
                        getSharedPreferences(LocalAutofillDataSource.SHARED_PREF_KEY, Context.MODE_PRIVATE);
                DefaultFieldTypesSource defaultFieldTypesSource =
                        DefaultFieldTypesLocalJsonSource.getInstance(getResources(),
                                new GsonBuilder().create());
                AutofillDao autofillDao = AutofillDatabase.getInstance(thisActivity,
                        defaultFieldTypesSource, new AppExecutors()).autofillDao();
                mLocalAutofillDataSource = LocalAutofillDataSource.getInstance(sharedPreferences,
                        autofillDao, new AppExecutors());
                mPackageName = getPackageName();
                mPreferences = MyPreferences.getInstance(thisActivity);


                // todo
//                findViewById(R.id.read_card).setOnClickListener((view) -> {
//                    etherDataList.clear();
//                    BLEClient.initEthBLE(thisActivity, listeners, listeners, listeners);
//                });
//                findViewById(R.id.cancel).setOnClickListener((view) -> {
//                    onFailure();
//                    AuthActivity.this.finish();
//                });
                BLEClient = new EthBLEClient();
                etherDataList.clear();
                Log.d("hhhh", "ffff : " + peripheralId);
                if (peripheralId == null) {
                    //tvDeviceNotfound.setVisibility(View.VISIBLE);
                    progressBar.setVisibility(View.GONE);
                    authLayout.setVisibility(View.VISIBLE);
                    tvScanDevice.setText(R.string.device_not_register);
                    tvPeripheralId.setVisibility(View.GONE);
                    tvPeripheralName.setVisibility(View.GONE);
                } else {
                    if (btAdapter.isEnabled()) {
                        BLEClient.initEthBLE(thisActivity, listeners, listeners, listeners, peripheralId, true);
                        Constant.ethBLEClient = BLEClient;
                        Constant.PIN_NOT_MATCH = false;
                    }

                }
            }

            @Override
            public void onDenied(Context context, ArrayList<String> deniedPermissions) {
                super.onDenied(context, deniedPermissions);
                finish();
            }
        });

    }


    private SearchView.OnQueryTextListener searchView() {
        return new SearchView.OnQueryTextListener() {
            @Override
            public boolean onQueryTextSubmit(String query) {
                accountAdapter.getFilter().filter(query);
                return false;
            }

            @Override
            public boolean onQueryTextChange(String newText) {
                accountAdapter.getFilter().filter(newText);
                return false;
            }
        };

    }


    private void initRecyclerView() {
        layoutManager = new LinearLayoutManager(this);
        accountAdapter = new AccountAdapter(this, etherDataList);
        rcvAccoutList.setLayoutManager(layoutManager);
        rcvAccoutList.setAdapter(accountAdapter);
    }

//    @Override
//    public boolean onCreateOptionsMenu(Menu menu) {
//        // Inflate the menu; this adds items to the action bar if it is present.
//        getMenuInflater().inflate(R.menu.menu_refresh, menu);
//        return true;
//    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // handle arrow click here
        if (item.getItemId() == android.R.id.home) {
            onFailure();
            AuthActivity.this.finish();
            finish();// close this activity and return to preview activity (if there is any)
        }

        if (item.getItemId() == R.id.nav_refresh_device) {
            tvDeviceNotfound.setVisibility(View.GONE);
            authLayout.setVisibility(View.VISIBLE);
            etherDataList.clear();
            if (peripheralId == null) {
                tvDeviceNotfound.setVisibility(View.VISIBLE);
                authLayout.setVisibility(View.GONE);
                tvDeviceNotfound.setText(R.string.device_not_register);
            } else {
                editTextSearch.setVisibility(View.GONE);
                relativeLayout.setVisibility(View.VISIBLE);
                etherDataList.clear();
                accountAdapter.notifyDataSetChanged();
                BLEClient.initEthBLE(thisActivity, listeners, listeners, listeners, peripheralId, true);
            }

        }
        return super.onOptionsItemSelected(item);
    }


    @Override
    public void finish() {
        if (mReplyIntent != null) {
            setResult(RESULT_OK, mReplyIntent);
        } else {
            setResult(RESULT_CANCELED);
        }
        super.finish();
    }

    private void onFailure() {
        logw("Failed auth.");
        mReplyIntent = null;
    }


    private void onSuccess() {
        Intent intent = getIntent();
        boolean forResponse = intent.getBooleanExtra(EXTRA_FOR_RESPONSE, true);
        AssistStructure structure = intent.getParcelableExtra(EXTRA_ASSIST_STRUCTURE);
        ClientParser clientParser = new ClientParser(structure);
        mReplyIntent = new Intent();
        mLocalAutofillDataSource.getFieldTypeByAutofillHints(
                new DataCallback<HashMap<String, FieldTypeWithHeuristics>>() {
                    @Override
                    public void onLoaded(HashMap<String, FieldTypeWithHeuristics> fieldTypesByAutofillHint) {
                        ClientViewMetadataBuilder builder = new ClientViewMetadataBuilder(clientParser,
                                fieldTypesByAutofillHint);
                        mClientViewMetadata = builder.buildClientViewMetadata();
                        mDatasetAdapter = new DatasetAdapter(clientParser);
                        mResponseAdapter = new ResponseAdapter(AuthActivity.this,
                                mClientViewMetadata, mPackageName, mDatasetAdapter);
                        editTextSearch.setVisibility(View.VISIBLE);
                        relativeLayout.setVisibility(View.GONE);
                        accountAdapter.notifyDataSetChanged();

                        //fetchAllDatasetsAndSetIntent(fieldTypesByAutofillHint, structure);

                    }

                    @Override
                    public void onDataNotAvailable(String msg, Object... params) {

                    }
                });
    }

    @NonNull
    static RemoteViews newDatasetPresentation(@NonNull String packageName,
                                              @NonNull CharSequence text) {
        RemoteViews presentation =
                new RemoteViews(packageName, R.layout.multidataset_service_list_item);
        presentation.setTextViewText(R.id.text, text);
        presentation.setImageViewResource(R.id.icon, R.mipmap.ethernomlogo);
        return presentation;
    }


    @NonNull
    static Map<String, AutofillId> getAutofillableFields(@NonNull AssistStructure structure) {
        Map<String, AutofillId> fields = new ArrayMap<>();
        int nodes = structure.getWindowNodeCount();
        for (int i = 0; i < nodes; i++) {
            AssistStructure.ViewNode node = structure.getWindowNodeAt(i).getRootViewNode();
            addAutofillableFields(fields, node);
        }

        Log.d("xxxyyy", "fields : " + fields);
        return fields;
    }

    private static void addAutofillableFields(@NonNull Map<String, AutofillId> fields,
                                              @NonNull AssistStructure.ViewNode node) {
        String hint = getHint(node);
        if (hint != null) {
            AutofillId id = node.getAutofillId();
            if (!fields.containsKey(hint)) {
                fields.put(hint, id);
            } else {
                Log.v(TAG, "Ignoring hint '" + hint + "' on " + id
                        + " because it was already set");
            }
        }
        int childrenSize = node.getChildCount();
        for (int i = 0; i < childrenSize; i++) {
            addAutofillableFields(fields, node.getChildAt(i));
        }
    }


    @Nullable
    protected static String getHint(@NonNull AssistStructure.ViewNode node) {

        // First try the explicit autofill hints...

        String[] hints = node.getAutofillHints();
        if (hints != null) {
            // We're simple, we only care about the first hint
            return hints[0].toLowerCase();
        }

        // Then try some rudimentary heuristics based on other node properties

        String viewHint = node.getHint();
        String hint = inferHint(node, viewHint);
        if (hint != null) {
            Log.d(TAG, "Found hint using view hint(" + viewHint + "): " + hint);
            return hint;
        } else if (!TextUtils.isEmpty(viewHint)) {
            Log.v(TAG, "No hint using view hint: " + viewHint);
        }

        String resourceId = node.getIdEntry();
        hint = inferHint(node, resourceId);
        if (hint != null) {
            Log.d(TAG, "Found hint using resourceId(" + resourceId + "): " + hint);
            return hint;
        } else if (!TextUtils.isEmpty(resourceId)) {
            Log.v(TAG, "No hint using resourceId: " + resourceId);
        }

        CharSequence text = node.getText();
        CharSequence className = node.getClassName();
        if (text != null && className != null && className.toString().contains("EditText")) {
            hint = inferHint(node, text.toString());
            if (hint != null) {
                // NODE: text should not be logged, as it could contain PII
                Log.d(TAG, "Found hint using text(" + text + "): " + hint);
                return hint;
            }
        } else if (!TextUtils.isEmpty(text)) {
            // NODE: text should not be logged, as it could contain PII
            Log.v(TAG, "No hint using text: " + text + " and class " + className);
        }
        return null;
    }

    /**
     * Uses heuristics to infer an autofill hint from a {@code string}.
     *
     * @return standard autofill hint, or {@code null} when it could not be inferred.
     */
    @Nullable
    protected static String inferHint(AssistStructure.ViewNode node, @Nullable String actualHint) {
        if (actualHint == null) return null;

        String hint = actualHint.toLowerCase();
        if (hint.contains("label") || hint.contains("container")) {
            Log.v(TAG, "Ignoring 'label/container' hint: " + hint);
            return null;
        }

        if (hint.contains("password")) return View.AUTOFILL_HINT_PASSWORD;
        if (hint.contains("username") || (hint.contains("login") && hint.contains("id")))
            return View.AUTOFILL_HINT_USERNAME;
        if (hint.contains("email")) return View.AUTOFILL_HINT_EMAIL_ADDRESS;
        if (hint.contains("name")) return View.AUTOFILL_HINT_NAME;
        if (hint.contains("phone")) return View.AUTOFILL_HINT_PHONE;

        // When everything else fails, return the full string - this is helpful to help app
        // developers visualize when autofill is triggered when it shouldn't (for example, in a
        // chat conversation window), so they can mark the root view of such activities with
        // android:importantForAutofill=noExcludeDescendants
        if (node.isEnabled() && node.getAutofillType() != View.AUTOFILL_TYPE_NONE) {
            Log.v(TAG, "Falling back to " + actualHint);
            return actualHint;
        }
        return null;
    }


    private void fetchItemDataSet(EtherEntry mEtherEntry) {
        Intent intent = getIntent();
        AssistStructure structure = intent.getParcelableExtra(EXTRA_ASSIST_STRUCTURE);
        mReplyIntent = new Intent();
        Dataset.Builder dataset = new Dataset.Builder();

        Map<String, AutofillId> fields = getAutofillableFields(structure);
        Log.d("sophatnith", "field in auth : " + fields);

        FillResponse.Builder response = new FillResponse.Builder();
        String packageName = getApplicationContext().getPackageName();
        if (!fields.isEmpty()) {
            for (Map.Entry<String, AutofillId> field : fields.entrySet()) {
                Log.d("xxx", "field : " + field);
                String hint = field.getKey();
                AutofillId id = field.getValue();

                RemoteViews presentation = newDatasetPresentation(packageName, mEtherEntry.URL);
                String val = "";
                if (hint.contains("password")) val = mEtherEntry.password;
                else if (hint.contains("username") || (hint.contains("login") && hint.contains("id")))
                    val = mEtherEntry.username;
                else if (hint.contains("email")) val = mEtherEntry.username;
                else if (hint.contains("name")) val = mEtherEntry.username;
                else if (hint.contains("phone")) val = mEtherEntry.username;


                Log.d("sophatnith", "val : " + val);
                Log.d("sophatnith", "val : " + presentation);
                dataset.setValue(id, AutofillValue.forText(val), presentation);
            }
        }


        response.addDataset(dataset.build());
        Collection<AutofillId> ids = fields.values();
        AutofillId[] requiredIds = new AutofillId[ids.size()];
        ids.toArray(requiredIds);
        response.setSaveInfo(
                // We're simple, so we're generic
                new SaveInfo.Builder(SaveInfo.SAVE_DATA_TYPE_GENERIC, requiredIds).build());
//        setResponseIntent(response.build());
        mReplyIntent.putExtra(EXTRA_AUTHENTICATION_RESULT, response.build());

        finish();
    }

    @Override
    public void onDeviceNotFound() {
        tvDeviceNotfound.setVisibility(View.VISIBLE);
        authLayout.setVisibility(View.GONE);
        tvDeviceNotfound.setText(R.string.device_not_found);
    }

    @Override
    public void onScanDevice() {
        tvScanDevice.setText(R.string.scanning_device);
    }

    @Override
    public void onConnectDevice() {
        tvScanDevice.setText(R.string.connecting_to_device);
    }

    @Override
    public void onAddAccSuccess() {

    }

    @Override
    public void onRequestInputPin() {
        Log.d("xxx", "--------------------------onRequestInputPin-------------------------");
        runOnUiThread(() -> {
            //Constant.PIN_NOT_MATCH = false;
            lnPin.setVisibility(View.VISIBLE);
        });
    }

    @Override
    public void onReplyPinNotMatch(Boolean isMatch) {
        Log.d("xxx", "----------------------onReplyPinNotMatch--------------------------" + isMatch);
        runOnUiThread(() -> {
            if (isMatch) {
                tvScanDevice.setText(R.string.retrieving_data);
                lnPin.setVisibility(View.GONE);
                txtErrPin.setVisibility(View.GONE);
            } else {
                tvScanDevice.setText(R.string.connecting_to_device);
                lnPin.setVisibility(View.VISIBLE);
                txtErrPin.setVisibility(View.VISIBLE);
                btnSubmit.setBackground(getDrawable(R.drawable.bg_btn_disable));
                pinView.setText("");

            }
        });

    }

    @Override
    public void onCardReject() {
        runOnUiThread(() -> {
            tvScanDevice.setText(R.string.connecting_to_device);
            lnPin.setVisibility(View.VISIBLE);
            txtErrPin.setVisibility(View.VISIBLE);
            btnSubmit.setBackground(getDrawable(R.drawable.bg_btn_disable));
            pinView.setText("");
            finish();
        });
    }
}
