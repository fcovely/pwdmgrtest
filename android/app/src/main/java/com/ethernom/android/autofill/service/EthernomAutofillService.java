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

;

import android.Manifest;
import android.app.assist.AssistStructure;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.FillCallback;
import android.service.autofill.FillContext;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveRequest;
import android.util.Log;
import android.view.autofill.AutofillId;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import com.ethernom.android.autofill.service.data.ClientViewMetadata;
import com.ethernom.android.autofill.service.data.ClientViewMetadataBuilder;
import com.ethernom.android.autofill.service.data.DataCallback;
import com.ethernom.android.autofill.service.data.adapter.DatasetAdapter;
import com.ethernom.android.autofill.service.data.adapter.ResponseAdapter;
import com.ethernom.android.autofill.service.data.source.DefaultFieldTypesSource;
import com.ethernom.android.autofill.service.data.source.PackageVerificationDataSource;
import com.ethernom.android.autofill.service.data.source.local.DefaultFieldTypesLocalJsonSource;
import com.ethernom.android.autofill.service.data.source.local.DigitalAssetLinksRepository;
import com.ethernom.android.autofill.service.data.source.local.LocalAutofillDataSource;
import com.ethernom.android.autofill.service.data.source.local.SharedPrefsPackageVerificationRepository;
import com.ethernom.android.autofill.service.data.source.local.dao.AutofillDao;
import com.ethernom.android.autofill.service.data.source.local.db.AutofillDatabase;
import com.ethernom.android.autofill.service.model.FieldTypeWithHeuristics;
import com.ethernom.android.autofill.service.settings.MyPreferences;
import com.ethernom.android.autofill.service.util.AppExecutors;
import com.ethernom.android.autofill.service.util.Util;

import com.ethernom.android.autofill.service.util.UtilLibSessionMgr;
import com.psdmgr.R;
import com.google.gson.GsonBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.ethernom.android.autofill.service.AuthActivity.getAutofillableFields;
import static com.ethernom.android.autofill.service.util.Util.bundleToString;
import static com.ethernom.android.autofill.service.util.Util.dumpStructure;
import static com.ethernom.android.autofill.service.util.Util.logVerboseEnabled;
import static com.ethernom.android.autofill.service.util.Util.logv;
import static com.ethernom.android.autofill.service.util.Util.logw;
import static java.util.stream.Collectors.toList;

@RequiresApi(api = Build.VERSION_CODES.O)
public class EthernomAutofillService extends AutofillService {
    private LocalAutofillDataSource mLocalAutofillDataSource;
    private DigitalAssetLinksRepository mDalRepository;
    private PackageVerificationDataSource mPackageVerificationRepository;
    private ResponseAdapter mResponseAdapter;
    private ClientViewMetadata mClientViewMetadata;
    private MyPreferences mPreferences;
    private EthernomAutofillService thisService;
    private int lnNode;
    private String usernsmeA, passwordA, appPacket;
    private UtilLibSessionMgr mSession;


    @Override
    public void onCreate() {
        super.onCreate();
        thisService = this;

        mPreferences = MyPreferences.getInstance(this);
        Util.setLoggingLevel(mPreferences.getLoggingLevel());
        SharedPreferences localAfDataSourceSharedPrefs =
                getSharedPreferences(LocalAutofillDataSource.SHARED_PREF_KEY, Context.MODE_PRIVATE);
        DefaultFieldTypesSource defaultFieldTypesSource =
                DefaultFieldTypesLocalJsonSource.getInstance(getResources(),
                        new GsonBuilder().create());
        AutofillDao autofillDao = AutofillDatabase.getInstance(this,
                defaultFieldTypesSource, new AppExecutors()).autofillDao();
        mLocalAutofillDataSource = LocalAutofillDataSource.getInstance(localAfDataSourceSharedPrefs,
                autofillDao, new AppExecutors());
        mDalRepository = DigitalAssetLinksRepository.getInstance(getPackageManager());
        mPackageVerificationRepository = SharedPrefsPackageVerificationRepository.getInstance(this);

    }

    private Boolean status = false;

    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    public void onFillRequest(@NonNull FillRequest request,
                              @NonNull CancellationSignal cancellationSignal, @NonNull FillCallback callback) {
        Log.d("xxx", "onFillRequest");
        List<FillContext> fillContexts = request.getFillContexts();
        List<AssistStructure> structures =
                fillContexts.stream().map(FillContext::getStructure).collect(toList());
        AssistStructure latestStructure = fillContexts.get(fillContexts.size() - 1).getStructure();
        ClientParser parser = new ClientParser(structures);
        Map<String, AutofillId> fields = getAutofillableFields(latestStructure);

        Log.d("xxx", "fields : " + fields);

        if(!status) {
            status = true;
            if (fields.containsKey("email") || fields.containsKey("emailAddress") || fields.toString().contains("mail") || fields.containsKey("password") || fields.containsKey("username")) {
                mSession = new UtilLibSessionMgr(thisService);
                ApplicationInfo ai;
                PackageManager pm = this.getPackageManager();
                try {
                    ai = pm.getApplicationInfo(latestStructure.getActivityComponent().getPackageName(), 0);
                } catch (final PackageManager.NameNotFoundException e) {
                    ai = null;
                }
                final String applicationName = (String) (ai != null ? pm.getApplicationLabel(ai) : "(unknown)");
                final String[] appNameSplit = applicationName.split(" ");
                String newAppName = "";
                for (int i = 0; i < appNameSplit.length; i++) {
                    newAppName += appNameSplit[i].toLowerCase();
                }

                mSession.setPackageName(newAppName + ".com");

                Log.d("xxx", "fields : " + fields);

                mLocalAutofillDataSource.getFieldTypeByAutofillHints(
                        new DataCallback<HashMap<String, FieldTypeWithHeuristics>>() {
                            @Override
                            public void onLoaded(HashMap<String, FieldTypeWithHeuristics> fieldTypesByAutofillHint) {
                                DatasetAdapter datasetAdapter = new DatasetAdapter(parser);
                                ClientViewMetadataBuilder clientViewMetadataBuilder =
                                        new ClientViewMetadataBuilder(parser, fieldTypesByAutofillHint);
                                mClientViewMetadata = clientViewMetadataBuilder.buildClientViewMetadata();
                                mResponseAdapter = new ResponseAdapter(EthernomAutofillService.this,
                                        mClientViewMetadata, getPackageName(), datasetAdapter);
                                String packageName = latestStructure.getActivityComponent().getPackageName();
                                if (!mPackageVerificationRepository.putPackageSignatures(packageName)) {
                                    callback.onFailure(getString(R.string.invalid_package_signature));
                                    return;
                                }
                                if (logVerboseEnabled()) {
                                    logv("onFillRequest(): clientState=%s",
                                            bundleToString(request.getClientState()));
                                    dumpStructure(latestStructure);
                                }
                                cancellationSignal.setOnCancelListener(() ->
                                        logw("Cancel autofill not implemented in this sample.")
                                );
//                        fetchDataAndGenerateResponse(fieldTypesByAutofillHint, responseAuth,
                                //                              datasetAuth, manual, callback);
                                IntentSender sender = AuthActivity.getAuthIntentSenderForResponse(thisService);
                                RemoteViews remoteViews = RemoteViewsHelper.viewsWithAuth(getPackageName(),
                                        getString(R.string.autofill_sign_in_prompt));
                                FillResponse response = mResponseAdapter.buildManualResponse(sender, remoteViews);


                                if (response != null) {
                                    callback.onSuccess(response);
                                }
                            }

                            @Override
                            public void onDataNotAvailable(String msg, Object... params) {

                            }
                        });
            } else {
                Log.d("xxx", "fields : null");

            }

        }

    }


    @Override
    public void onSaveRequest(@NonNull SaveRequest request, @NonNull SaveCallback callback) {

        Log.d("xxx", "onSaveRequest");

        List<FillContext> fillContexts = request.getFillContexts();
        List<AssistStructure> structures =
                fillContexts.stream().map(FillContext::getStructure).collect(toList());
        AssistStructure latestStructure = fillContexts.get(fillContexts.size() - 1).getStructure();
        ClientParser parser = new ClientParser(structures);
        for (AssistStructure a : structures) {
            traverseStructure(a);

        }
    }

    private void traverseStructure (AssistStructure structure ) {
        int nodes = structure.getWindowNodeCount ();

        for ( int i = 0 ; i < nodes ; i ++) {
            AssistStructure.WindowNode windowNode = structure.getWindowNodeAt ( i );
            AssistStructure.ViewNode viewNode = windowNode.getRootViewNode ();
            traverseNode ( viewNode );
        }
    }

    private void traverseNode (AssistStructure.ViewNode viewNode ) {
        if ( viewNode . getAutofillHints () != null && viewNode.getAutofillHints().length > 0 ) {
        } else {
            if(viewNode.getIdPackage() != null){
                appPacket = viewNode.getIdPackage();
            }


            if(viewNode.getHint() != null)
                if(viewNode.getClassName().contains("EditText")){
                    if(viewNode.getHint().toLowerCase().contains("username") || viewNode.getHint().toLowerCase().contains("email")) {
                        usernsmeA = viewNode.getText()+"";
                    } else if(viewNode.getHint().toLowerCase().contains("password")) {
                        passwordA = viewNode.getText()+"";
                    }

                }

        }
        for ( int i = 0 ; i < viewNode.getChildCount (); i ++) {
            lnNode = viewNode.getChildCount ();
            AssistStructure.ViewNode childNode = viewNode.getChildAt (i);
            traverseNode ( childNode );
            if(i == lnNode-1){
                try {
                    startActivity(new Intent(thisService, SaveAuthActivity.class)
                            .putExtra("PACKET_NAME", appPacket)
                            .putExtra("USER_NAME", usernsmeA)
                            .putExtra("PASSWORD", passwordA)
                            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (Exception ex) {
                    Log.d("xxx", "ex : " + ex.getMessage());
                }

            }

        }
    }


}
